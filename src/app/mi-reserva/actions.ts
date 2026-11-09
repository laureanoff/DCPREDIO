"use server";

import { after } from "next/server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { cancelMyBooking, findMyBooking, type LookupResult } from "@/services/my-booking";
import { notifyStaff } from "@/services/push";

const schema = z.object({ code: z.string().min(4).max(20), phone: z.string().min(8).max(25) });

export async function lookupBooking(raw: unknown): Promise<LookupResult> {
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Ingresá el código y tu teléfono." };
  return findMyBooking(p.data.code, p.data.phone);
}

export async function cancelBookingByCustomer(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Ingresá el código y tu teléfono." };
  const r = await cancelMyBooking(p.data.code, p.data.phone);
  if (!r.ok) return r;
  updateTag("venue");
  after(() =>
    notifyStaff({
      title: "Reserva cancelada por el cliente",
      body: `${r.customerName} canceló su turno. El horario quedó libre.`,
      url: "/admin/reservas?estado=cancelled",
      tag: "cancel",
    }),
  );
  return { ok: true };
}
