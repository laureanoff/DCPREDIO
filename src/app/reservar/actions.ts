"use server";

import { after } from "next/server";
import { notifyStaff } from "@/services/push";
import { z } from "zod";
import { joinWaitlist } from "@/services/waitlist";
import { phoneSchema } from "@/validations/booking";
import { bookingInputSchema } from "@/validations/booking";
import { createPublicBooking, type CreateBookingResult } from "@/services/booking";
import { findMyBooking, resolveBookingId } from "@/services/my-booking";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createBooking(input: unknown): Promise<CreateBookingResult> {
  const parsed = bookingInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." };
  }

  // Honeypot: si un bot completó el campo oculto, respondemos con un error genérico sin guardar nada.
  if (parsed.data.website) {
    return { ok: false, error: "No pudimos guardar tu reserva. Intentá de nuevo en unos minutos." };
  }

  const result = await createPublicBooking(parsed.data);
  if (result.ok) {
    const b = result.booking;
    const when = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Cordoba", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(b.startAt));
    after(() =>
      notifyStaff({
        title: b.status === "pending" ? "Nueva reserva por confirmar" : "Nueva reserva",
        body: `${b.customerName} · ${when} hs`,
        url: b.status === "pending" ? "/admin/avisos" : `/admin/reservas/${b.id}`,
        tag: "booking",
      }),
    );
  }
  return result;
}

const waitSchema = z.object({
  courtId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }),
  name: z.string().trim().min(2, "Ingresá nombre y apellido.").max(100),
  phone: phoneSchema,
  website: z.string().max(200).optional(),
});

export async function joinWaitingList(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = waitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." };
  if (parsed.data.website) return { ok: false, error: "No pudimos anotarte. Probá de nuevo en unos minutos." };
  return joinWaitlist({ courtId: parsed.data.courtId, startAt: parsed.data.startAt, name: parsed.data.name, phone: parsed.data.phone });
}

/** Estado actual de una reserva (por código + teléfono), para que la pantalla de espera se actualice sola. */
export async function checkBookingStatus(code: string, phone: string): Promise<"pending" | "confirmed" | "cancelled" | "completed" | null> {
  if (typeof code !== "string" || typeof phone !== "string") return null;
  const r = await findMyBooking(code, phone);
  return r.ok ? r.booking.status : null;
}

const customerSubSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
});

/** Guarda el dispositivo del cliente para avisarle cuando el predio confirme su reserva. */
export async function saveCustomerPush(code: string, phone: string, raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const p = customerSubSchema.safeParse(raw);
  if (!p.success || typeof code !== "string" || typeof phone !== "string") return { ok: false, error: "Suscripción inválida." };
  const id = await resolveBookingId(code, phone);
  if (!id) return { ok: false, error: "No encontramos la reserva." };
  const { error } = await createAdminClient()
    .from("customer_push_subscriptions")
    .upsert({ booking_id: id, endpoint: p.data.endpoint, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth }, { onConflict: "booking_id,endpoint" });
  if (error) {
    console.error("[push] cliente guardar", error.code, error.message);
    return { ok: false, error: "No se pudo activar el aviso." };
  }
  return { ok: true };
}
