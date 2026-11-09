"use server";

import { after } from "next/server";
import { notifyStaff } from "@/services/push";
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
