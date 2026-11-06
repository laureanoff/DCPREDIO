"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./actions";

const ERRORS: Record<string, string> = {
  DC011: "El monto supera el saldo pendiente de la reserva.",
  DC012: "Los pagos no se pueden borrar: anulalos.",
};

const idSchema = z.string().uuid();

const paymentSchema = z.object({
  amount: z.number().positive("Ingresá un monto mayor a cero.").max(100_000_000),
  method: z.enum(["cash", "transfer", "other"]),
  notes: z.string().trim().max(300),
});

export async function registerPayment(bookingId: string, raw: z.input<typeof paymentSchema>): Promise<ActionResult> {
  await requireStaff();
  if (!idSchema.safeParse(bookingId).success) return { ok: false, error: "Reserva inválida." };
  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const supabase = await createClient();
  const { data: booking } = await supabase.from("bookings").select("status").eq("id", bookingId).maybeSingle();
  if (!booking) return { ok: false, error: "La reserva no existe." };
  if (booking.status === "cancelled") return { ok: false, error: "No se pueden registrar pagos en una reserva cancelada." };

  const { error } = await supabase.from("payments").insert({
    booking_id: bookingId,
    amount: Math.round(parsed.data.amount * 100) / 100,
    method: parsed.data.method,
    notes: parsed.data.notes || null,
  });
  if (error) {
    const known = error.code ? ERRORS[error.code] : undefined;
    if (!known) console.error("[admin/pagos]", error.code, error.message);
    return { ok: false, error: known ?? "No se pudo registrar el pago." };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Pago registrado." };
}

export async function voidPayment(paymentId: string, reason: string): Promise<ActionResult> {
  await requireStaff();
  if (!idSchema.safeParse(paymentId).success) return { ok: false, error: "Pago inválido." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .update({ is_voided: true, void_reason: reason.trim().slice(0, 300) || null })
    .eq("id", paymentId)
    .eq("is_voided", false)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[admin/pagos]", error.code, error.message);
    return { ok: false, error: "No se pudo anular el pago." };
  }
  if (!data) return { ok: false, error: "El pago no existe o ya estaba anulado." };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Pago anulado." };
}
