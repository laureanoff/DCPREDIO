"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Clock, Hash, Phone, Search, Wallet } from "lucide-react";
import { cancelBookingByCustomer, lookupBooking } from "./actions";
import type { MyBooking } from "@/services/my-booking";
import { cn, formatMoney } from "@/lib/utils";

const field = "h-12 w-full rounded-xl glass-input pl-11 pr-3 text-base outline-none transition placeholder:text-muted/70 focus:border-lime focus:ring-2 focus:ring-lime/30";
const TONE: Record<MyBooking["status"], string> = { pending: "border-warning/50 bg-warning/10 text-warning", confirmed: "border-lime/60 bg-lime/15 text-lime-ink", cancelled: "border-danger/50 bg-danger/10 text-danger", completed: "border-border bg-surface-2 text-muted" };
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
    <div className="flex flex-col gap-5">
      <form
        className="glass step-enter flex flex-col gap-3 rounded-[2rem] p-5 sm:p-6"
        style={{ animationDelay: ".1s" }}
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
        <label className="relative block">
          <span className="sr-only">Código de reserva</span>
          <Hash size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-3.5 text-lime-ink" />
          <input className={field} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código (DC-XXXXXX)" autoCapitalize="characters" autoComplete="off" required />
        </label>
        <label className="relative block">
          <span className="sr-only">Teléfono</span>
          <Phone size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-3.5 text-lime-ink" />
          <input className={field} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Tu teléfono" required />
        </label>
        <button type="submit" disabled={pending} className="cta-sheen relative mt-1 inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-lime font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-black shadow-[0_14px_34px_-14px_rgba(182,214,26,.8)] transition hover:bg-lime-dark disabled:opacity-60">
          <Search size={18} aria-hidden /> {pending ? "Buscando…" : "Ver mi reserva"}
        </button>
      </form>

      {error && <p role="alert" className="glass glass-danger step-enter rounded-2xl px-4 py-3 text-sm text-danger">{error}</p>}

      {booking && (
        <section key={booking.code + booking.status} className={cn("glass step-enter relative overflow-hidden rounded-[2rem] p-0", booking.status === "cancelled" ? "glass-danger" : "glass-lime")}>
          <div className="flex items-center justify-between gap-3 p-6 pb-4">
            <p className="font-mono text-sm font-semibold tracking-widest text-muted">{booking.code}</p>
            <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", TONE[booking.status])}>{STATUS[booking.status]}</span>
          </div>
          <div className="relative mx-0 h-px border-t border-dashed border-white/20" aria-hidden>
            <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-background" />
            <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-background" />
          </div>
          <div className="flex flex-col gap-3 p-6 pt-5">
            <p className="flex items-center gap-3 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase leading-none"><CalendarDays size={22} className="shrink-0 text-lime-ink" aria-hidden />{fmt(booking.startAt, { weekday: "long", day: "numeric", month: "long" })}</p>
            <p className="flex items-center gap-3 text-lg"><Clock size={20} className="shrink-0 text-lime-ink" aria-hidden />{fmt(booking.startAt, { hour: "2-digit", minute: "2-digit", hour12: false })} a {fmt(booking.endAt, { hour: "2-digit", minute: "2-digit", hour12: false })} hs{booking.multiCourt ? ` · ${booking.courtName}` : ""}</p>
            <p className="flex items-center gap-3 text-muted"><Wallet size={20} className="shrink-0 text-lime-ink" aria-hidden />Total: <strong className="text-foreground">{formatMoney(booking.totalPrice)}</strong></p>

            {booking.canCancel ? (
              confirming ? (
                <div className="glass glass-danger step-enter mt-2 flex flex-col gap-3 rounded-2xl p-4">
                  <p className="text-sm">¿Seguro que querés cancelar? El horario quedará libre para otras personas.</p>
                  <div className="flex gap-2">
                    <button disabled={pending} onClick={() => start(async () => {
                      const r = await cancelBookingByCustomer({ code, phone });
                      if (r.ok) { const again = await lookupBooking({ code, phone }); if (again.ok) setBooking(again.booking); setConfirming(false); }
                      else { setError(r.error); setConfirming(false); }
                    })} className="h-11 flex-1 rounded-xl bg-danger font-semibold text-white disabled:opacity-60">Sí, cancelar</button>
                    <button disabled={pending} onClick={() => setConfirming(false)} className="glass h-11 flex-1 rounded-xl font-semibold">No, volver</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirming(true)} className="glass mt-2 h-11 w-full rounded-xl font-semibold transition hover:border-danger hover:text-danger">Cancelar mi reserva</button>
              )
            ) : (
              booking.cancelHint && <p className="glass-soft mt-2 rounded-xl px-4 py-3 text-sm text-muted">{booking.cancelHint}</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
