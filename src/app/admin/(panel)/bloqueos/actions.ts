"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../reservas/actions";

const idSchema = z.string().uuid();

function refresh() {
  updateTag("venue");
  revalidatePath("/admin", "layout");
}

const blockSchema = z.object({
  courtId: idSchema,
  startAt: z.string().min(10).max(40),
  endAt: z.string().min(10).max(40),
  reason: z.string().trim().max(200),
});

/** Bloquea un rango horario. Se rechaza si pisa reservas activas: primero hay que cancelarlas o moverlas. */
export async function createBlock(raw: z.input<typeof blockSchema>): Promise<ActionResult> {
  await requireStaff();
  const parsed = blockSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const v = parsed.data;
  const start = new Date(v.startAt);
  const end = new Date(v.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return { ok: false, error: "El rango de horarios no es válido." };

  const supabase = await createClient();
  const { data: clash, error: clashError } = await supabase
    .from("bookings")
    .select("code, customer_name")
    .eq("court_id", v.courtId)
    .in("status", ["pending", "confirmed"])
    .lt("start_at", end.toISOString())
    .gt("end_at", start.toISOString())
    .limit(3);
  if (clashError) return { ok: false, error: "No se pudo verificar las reservas existentes." };
  if (clash && clash.length > 0) {
    const list = clash.map((b) => `${b.code} (${b.customer_name})`).join(", ");
    return { ok: false, error: `Hay reservas en ese rango: ${list}. Cancelalas o reprogramalas antes de bloquear.` };
  }

  const { error } = await supabase.from("blocked_slots").insert({ court_id: v.courtId, start_at: start.toISOString(), end_at: end.toISOString(), reason: v.reason || null });
  if (error) {
    console.error("[bloqueos] insert", error.code, error.message);
    return { ok: false, error: "No se pudo crear el bloqueo." };
  }
  refresh();
  return { ok: true, message: "Horario bloqueado. Ya no se puede reservar en la web." };
}

export async function deleteBlock(id: string): Promise<ActionResult> {
  await requireStaff();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Bloqueo inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("blocked_slots").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo quitar el bloqueo." };
  refresh();
  return { ok: true, message: "Bloqueo quitado." };
}

const dayRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^\d{2}:\d{2}$/;
const specialSchema = z.object({
  day: z.string().regex(dayRe),
  closed: z.boolean(),
  open: z.string().regex(timeRe).or(z.literal("")),
  close: z.string().regex(timeRe).or(z.literal("")),
  note: z.string().trim().max(200),
});

/** Día especial (feriado, evento): cerrado o con horario distinto. Solo el administrador. */
export async function saveSpecialDay(raw: z.input<typeof specialSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = specialSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const v = parsed.data;
  if (!v.closed && (!v.open || !v.close || v.open === v.close)) return { ok: false, error: "Indicá hora de apertura y de cierre distintas, o marcá el día como cerrado." };

  const supabase = await createClient();
  const { error } = await supabase.from("special_days").upsert(
    { day: v.day, is_closed: v.closed, open_time: v.closed ? null : v.open, close_time: v.closed ? null : v.close, note: v.note || null },
    { onConflict: "day" },
  );
  if (error) {
    console.error("[bloqueos] special", error.code, error.message);
    return { ok: false, error: "No se pudo guardar el día especial." };
  }
  refresh();
  return { ok: true, message: "Día especial guardado." };
}

export async function deleteSpecialDay(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Día inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("special_days").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo quitar el día especial." };
  refresh();
  return { ok: true, message: "Día especial quitado." };
}
