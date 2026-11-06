"use server";

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

  return createPublicBooking(parsed.data);
}
