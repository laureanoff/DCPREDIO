"use server";

import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNewBooking } from "@/services/whatsapp";
import { bookingInputSchema } from "@/validations/booking";
import { createPublicBooking, type CreateBookingResult } from "@/services/booking";

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
    // El aviso se envía después de responder: si WhatsApp falla o tarda, la reserva ya está confirmada.
    const bookingId = result.booking.id;
    after(async () => {
      try {
        await notifyNewBooking(createAdminClient(), bookingId);
      } catch (e) {
        console.error("[booking] no se pudo avisar por WhatsApp:", e instanceof Error ? e.message : e);
      }
    });
  }
  return result;
}
