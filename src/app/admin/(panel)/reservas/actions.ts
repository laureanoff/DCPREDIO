"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { phoneSchema } from "@/validations/booking";
import { getBooking } from "@/queries/admin";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const DB_ERRORS: Record<string, string> = {
  DC001: "Ese turno ya está ocupado. Elegí otro horario.",
  DC002: "Ese horario está bloqueado.",
  DC003: "No quedan lugares suficientes en ese turno.",
  DC005: "El nombre del cliente es obligatorio.",
  DC006: "Ese horario no es válido.",
  DC007: "El teléfono no es válido.",
  DC008: "Ese horario ya pasó.",
  DC010: "La cantidad de jugadores no es válida.",
  DC014: "Ese teléfono ya tiene el máximo de reservas activas.",
  DC016: "Estado inválido.",
};

function fail(error: { code?: string; message?: string } | null, fallback: string): ActionResult {
  const known = error?.code ? DB_ERRORS[error.code] : undefined;
  if (!known) console.error("[admin/reservas]", error?.code, error?.message);
  return { ok: false, error: known ?? fallback };
}

const idSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function refresh() {
  revalidatePath("/admin", "layout");
}

const editSchema = z.object({
  name: z.string().trim().min(2, "Ingresá nombre y apellido.").max(100),
  phone: phoneSchema,
  notes: z.string().trim().max(500),
});

/** Edita los datos de contacto y las notas. El precio y la capacidad del turno no se tocan desde acá. */
export async function updateBooking(id: string, raw: z.input<typeof editSchema>): Promise<ActionResult> {
  await requireStaff();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Reserva inválida." };
  const parsed = editSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const v = parsed.data;

  const current = await getBooking(id);
  if (!current) return { ok: false, error: "La reserva no existe." };
  if (current.status === "cancelled") return { ok: false, error: "Una reserva cancelada no se puede editar. Reactivala primero." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ customer_name: v.name, customer_phone: v.phone, notes: v.notes || null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fail(error, "No se pudo guardar. Intentá de nuevo.");
  if (!data) return { ok: false, error: "No tenés permiso para modificar esta reserva." };
  refresh();
  return { ok: true, message: "Cambios guardados." };
}

/** Cambia el estado entre pendiente / confirmada / completada (también reactiva una cancelada). */
export async function setBookingStatus(id: string, status: "pending" | "confirmed" | "completed"): Promise<ActionResult> {
  await requireStaff();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Reserva inválida." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status, cancel_reason: null, cancelled_at: null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fail(error, "No se pudo cambiar el estado.");
  if (!data) return { ok: false, error: "La reserva no existe." };
  refresh();
  return { ok: true, message: "Estado actualizado." };
}

export async function cancelBooking(id: string, reason: string): Promise<ActionResult> {
  await requireStaff();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Reserva inválida." };
  const clean = reason.trim().slice(0, 300);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", cancel_reason: clean || null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fail(error, "No se pudo cancelar la reserva.");
  if (!data) return { ok: false, error: "La reserva no existe." };
  refresh();
  return { ok: true, message: "Reserva cancelada. El horario quedó libre." };
}

export type SlotOption = { start: string; end: string; state: string; spotsLeft: number };

/** Horarios de un día con su disponibilidad, para reprogramar. */
export async function loadSlots(courtId: string, date: string): Promise<{ ok: true; slots: SlotOption[] } | { ok: false; error: string }> {
  await requireStaff();
  if (!idSchema.safeParse(courtId).success || !dateSchema.safeParse(date).success) return { ok: false, error: "Fecha inválida." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_day_availability", { p_court_id: courtId, p_date: date });
  if (error) return { ok: false, error: "No se pudieron leer los horarios." };
  return {
    ok: true,
    slots: (data ?? []).map((s) => ({ start: s.slot_start, end: s.slot_end, state: s.state, spotsLeft: s.spots_left })),
  };
}

export async function rescheduleBooking(id: string, date: string, slotStart: string): Promise<ActionResult> {
  await requireStaff();
  if (!idSchema.safeParse(id).success || !dateSchema.safeParse(date).success) return { ok: false, error: "Datos inválidos." };
  const supabase = await createClient();

  // El fin del turno sale de la grilla real de horarios, nunca del navegador.
  const { data: slots, error: slotsError } = await supabase.rpc("day_slots", { p_date: date });
  if (slotsError) return { ok: false, error: "No se pudieron leer los horarios." };
  const wanted = new Date(slotStart).getTime();
  const slot = (slots ?? []).find((s) => new Date(s.slot_start).getTime() === wanted);
  if (!slot) return { ok: false, error: "Ese horario no existe para la fecha elegida." };

  const { data, error } = await supabase
    .from("bookings")
    .update({ start_at: slot.slot_start, end_at: slot.slot_end })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fail(error, "No se pudo reprogramar la reserva.");
  if (!data) return { ok: false, error: "La reserva no existe." };
  refresh();
  return { ok: true, message: "Reserva reprogramada." };
}

/**
 * Elimina reservas canceladas (solo admin). Por defecto conserva las que tienen pagos registrados;
 * con includePaid también borra esas (y sus pagos: el movimiento queda en el historial de auditoría).
 * ids vacío/undefined = todas las canceladas.
 */
export async function deleteCancelledBookings(ids?: string[], includePaid = false): Promise<ActionResult> {
  await requireAdmin();
  if (ids && !ids.every((i) => idSchema.safeParse(i).success)) return { ok: false, error: "Reserva inválida." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_cancelled_bookings", {
    ...(ids?.length ? { p_ids: ids } : {}),
    ...(includePaid ? { p_include_paid: true } : {}),
  });
  if (error) return fail(error, "No se pudieron eliminar las reservas.");
  const r = Array.isArray(data) ? data[0] : data;
  const deleted = Number(r?.deleted ?? 0);
  const skipped = Number(r?.skipped ?? 0);
  refresh();
  if (deleted === 0 && skipped === 0) return { ok: true, message: "No había reservas canceladas para eliminar." };
  const kept = skipped
    ? skipped === 1
      ? " 1 se conservó porque tiene pagos registrados."
      : ` ${skipped} se conservaron porque tienen pagos registrados.`
    : "";
  return { ok: true, message: `${deleted} ${deleted === 1 ? "reserva eliminada" : "reservas eliminadas"}.${kept}` };
}

const newSchema = z.object({
  courtId: idSchema,
  slotStarts: z.array(z.string().min(10).max(40)).min(1, "Elegí al menos un horario.").max(12, "Máximo 12 turnos por vez."),
  name: z.string().trim().min(2, "Ingresá nombre y apellido.").max(100),
  phone: phoneSchema,
  notes: z.string().trim().max(500),
  status: z.enum(["pending", "confirmed"]),
});

/** Carga una o varias reservas a mano (pedidos por teléfono, cumpleaños). Todo o nada, con la misma regla anti-doble-reserva que la web. */
export async function createManualBooking(raw: z.input<typeof newSchema>): Promise<(ActionResult & { id?: string; count?: number })> {
  await requireStaff();
  const parsed = newSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const v = parsed.data;
  if (v.slotStarts.some((t) => Number.isNaN(new Date(t).getTime()))) return { ok: false, error: "Horario inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_staff_bookings", {
    p_court_id: v.courtId,
    p_starts: v.slotStarts,
    p_customer_name: v.name,
    p_customer_phone: v.phone,
    p_notes: v.notes || undefined,
    p_status: v.status,
  });
  if (error || !data || data.length === 0) return fail(error, "No se pudo cargar la reserva.");
  refresh();
  const codes = data.map((b) => b.code).join(", ");
  return { ok: true, message: data.length === 1 ? `Reserva ${codes} cargada.` : `${data.length} reservas cargadas: ${codes}.`, id: data[0].id, count: data.length };
}
