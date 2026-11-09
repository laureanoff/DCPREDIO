"use client";

import { useState, useTransition } from "react";
import { cancelBookingByCustomer, lookupBooking } from "./actions";
import type { MyBooking } from "@/services/my-booking";
import { formatMoney } from "@/lib/utils";

const field = "h-12 w-full rounded-xl border border-border bg-surface-2 px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";
const STATUS: Record<MyBooking["status"], string> = { pending: "Pendiente de confirmación", confirmed: "Confirmada", cancelled: "Cancelada", completed: "Completada" };
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Cordoba", ...o }).format(new Date(iso));

export function MyBookingForm() {
  const [pending, start] = useTransition();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState<MyBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mt-6 flex flex-col gap-5">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setConfirming(false);
          start(async () => {
            const r = await lookupBooking({ code, phone });
            if (r.ok) setBooking(r.booking);
            else { setBooking(null); setError(r.error); }
          });
        }}
      >
        <input className={field} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código (DC-XXXXXX)" autoCapitalize="characters" autoComplete="off" required />
        <input className={field} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Tu teléfono" required />
        <button type="submit" disabled={pending} className="h-12 rounded-xl bg-lime font-semibold text-black disabled:opacity-60">{pending ? "Buscando…" : "Ver mi reserva"}</button>
      </form>

      {error && <p role="alert" className="rounded-xl border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {booking && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{booking.code}</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold capitalize">{fmt(booking.startAt, { weekday: "long", day: "numeric", month: "long" })}</p>
          <p className="text-lg">{fmt(booking.startAt, { hour: "2-digit", minute: "2-digit", hour12: false })} a {fmt(booking.endAt, { hour: "2-digit", minute: "2-digit", hour12: false })} hs{booking.multiCourt ? ` · ${booking.courtName}` : ""}</p>
          <p className="mt-2 text-sm">Estado: <strong>{STATUS[booking.status]}</strong></p>
          <p className="text-sm text-muted">Total: {formatMoney(booking.totalPrice)}</p>

          {booking.canCancel ? (
            confirming ? (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-sm">¿Seguro que querés cancelar? El horario quedará libre para otras personas.</p>
                <div className="flex gap-2">
                  <button disabled={pending} onClick={() => start(async () => {
                    const r = await cancelBookingByCustomer({ code, phone });
                    if (r.ok) { const again = await lookupBooking({ code, phone }); if (again.ok) setBooking(again.booking); setConfirming(false); }
                    else { setError(r.error); setConfirming(false); }
                  })} className="h-11 flex-1 rounded-xl bg-danger font-semibold text-white disabled:opacity-60">Sí, cancelar</button>
                  <button disabled={pending} onClick={() => setConfirming(false)} className="h-11 flex-1 rounded-xl border border-border font-semibold">No, volver</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirming(true)} className="mt-4 h-11 w-full rounded-xl border border-border font-semibold hover:border-danger">Cancelar mi reserva</button>
            )
          ) : (
            booking.cancelHint && <p className="mt-4 text-sm text-muted">{booking.cancelHint}</p>
          )}
        </section>
      )}
    </div>
  );
}
