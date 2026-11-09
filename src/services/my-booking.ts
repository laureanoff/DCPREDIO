import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type MyBooking = {
  code: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  startAt: string;
  endAt: string;
  courtName: string;
  multiCourt: boolean;
  totalPrice: number;
  canCancel: boolean;
  /** Por qué no se puede cancelar (para mostrárselo al cliente). */
  cancelHint: string | null;
};

export type LookupResult = { ok: true; booking: MyBooking } | { ok: false; error: string };

const NOT_FOUND = "No encontramos una reserva con ese código y teléfono. Revisá los datos.";

function digits(v: string) {
  return v.replace(/\D/g, "");
}

/** Dos teléfonos coinciden si comparten los últimos 8 dígitos (tolera +54, 9, 0 y 15). */
function samePhone(a: string, b: string) {
  const x = digits(a).slice(-8);
  const y = digits(b).slice(-8);
  return x.length === 8 && x === y;
}

export async function findMyBooking(code: string, phone: string): Promise<LookupResult> {
  const cleanCode = code.trim().toUpperCase().replace(/\s/g, "");
  if (!/^DC-[A-Z0-9]{4,10}$/.test(cleanCode) || digits(phone).length < 8) return { ok: false, error: NOT_FOUND };

  const supabase = createAdminClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("id, code, status, start_at, end_at, total_price, customer_phone, court_id")
    .eq("code", cleanCode)
    .maybeSingle();
  if (!b || !samePhone(b.customer_phone, phone)) return { ok: false, error: NOT_FOUND };

  const [{ data: settings }, { data: courts }, { count: paid }] = await Promise.all([
    supabase.from("venue_settings").select("allow_customer_cancellation, cancellation_cutoff_hours").eq("id", 1).single(),
    supabase.from("courts").select("id, name").eq("is_active", true),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("booking_id", b.id).eq("is_voided", false),
  ]);

  let cancelHint: string | null = null;
  if (b.status === "cancelled") cancelHint = "Esta reserva ya está cancelada.";
  else if (b.status === "completed") cancelHint = "Este turno ya se jugó.";
  else if (!settings?.allow_customer_cancellation) cancelHint = "Para cancelar comunicate con el predio.";
  else if ((paid ?? 0) > 0) cancelHint = "Tiene pagos registrados: para cancelar comunicate con el predio.";
  else {
    const limit = new Date(b.start_at).getTime() - (settings.cancellation_cutoff_hours ?? 0) * 3_600_000;
    if (Date.now() >= limit) {
      const h = settings.cancellation_cutoff_hours ?? 0;
      cancelHint = h > 0 ? `Ya no se puede cancelar online (hasta ${h} h antes del turno). Comunicate con el predio.` : "El turno ya empezó.";
    }
  }

  return {
    ok: true,
    booking: {
      code: b.code,
      status: b.status,
      startAt: b.start_at,
      endAt: b.end_at,
      courtName: courts?.find((c) => c.id === b.court_id)?.name ?? "Cancha",
      multiCourt: (courts?.length ?? 0) > 1,
      totalPrice: Number(b.total_price),
      canCancel: cancelHint === null,
      cancelHint,
    },
  };
}

export async function cancelMyBooking(code: string, phone: string): Promise<{ ok: true; id: string; customerName: string; startAt: string; endAt: string; courtId: string } | { ok: false; error: string }> {
  const found = await findMyBooking(code, phone);
  if (!found.ok) return found;
  if (!found.booking.canCancel) return { ok: false, error: found.booking.cancelHint ?? "No se puede cancelar esta reserva." };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", cancel_reason: "Cancelada por el cliente desde la web" })
    .eq("code", found.booking.code)
    .in("status", ["pending", "confirmed"])
    .select("id, customer_name, start_at, end_at, court_id")
    .maybeSingle();
  if (error || !data) {
    console.error("[mi-reserva] cancelar", error?.code, error?.message);
    return { ok: false, error: "No pudimos cancelar la reserva. Intentá de nuevo o comunicate con el predio." };
  }
  return { ok: true, id: data.id, customerName: data.customer_name, startAt: data.start_at, endAt: data.end_at, courtId: data.court_id };
}
