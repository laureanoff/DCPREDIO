"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBooking, loadSlots, rescheduleBooking, setBookingStatus, updateBooking, type ActionResult, type SlotOption } from "../actions";
import { cn } from "@/lib/utils";

type Props = {
  booking: {
    id: string;
    courtId: string;
    status: "pending" | "confirmed" | "cancelled" | "completed";
    name: string;
    phone: string;
    mode: "individual" | "group";
    players: number;
    notes: string;
    date: string;
    startAt: string;
  };
  maxPlayers: number;
  today: string;
};

const field =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";
const btn = "h-11 rounded-xl border border-border px-4 text-sm font-semibold transition hover:border-lime disabled:cursor-not-allowed disabled:opacity-50";

const time = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Cordoba", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

export function BookingManager({ booking, maxPlayers, today }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const cancelled = booking.status === "cancelled";

  const [name, setName] = useState(booking.name);
  const [phone, setPhone] = useState(booking.phone);
  const [mode, setMode] = useState(booking.mode);
  const [players, setPlayers] = useState(booking.players);
  const [notes, setNotes] = useState(booking.notes);

  const [reason, setReason] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [date, setDate] = useState(booking.date);
  const [slots, setSlots] = useState<SlotOption[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  function run(action: () => Promise<ActionResult>, after?: () => void) {
    setMsg(null);
    start(async () => {
      const r = await action();
      setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  }

  async function fetchSlots(d: string) {
    setDate(d);
    setSlots(null);
    if (!d) return;
    setSlotsLoading(true);
    const r = await loadSlots(booking.courtId, d);
    setSlotsLoading(false);
    if (r.ok) setSlots(r.slots);
    else setMsg({ ok: false, text: r.error });
  }

  return (
    <div className="flex flex-col gap-6">
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={cn("rounded-2xl border px-4 py-3 text-sm", msg.ok ? "border-lime-ink/40 bg-lime/10 text-lime-ink" : "border-danger/50 bg-danger/10 text-danger")}>
          {msg.text}
        </p>
      )}

      {/* Estado */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold uppercase">Estado</h2>
        <div className="flex flex-wrap gap-2">
          {booking.status !== "confirmed" && (
            <button className={btn} disabled={pending} onClick={() => run(() => setBookingStatus(booking.id, "confirmed"))}>
              {cancelled ? "Reactivar como confirmada" : "Marcar confirmada"}
            </button>
          )}
          {booking.status !== "completed" && !cancelled && (
            <button className={btn} disabled={pending} onClick={() => run(() => setBookingStatus(booking.id, "completed"))}>Marcar completada</button>
          )}
          {booking.status !== "pending" && !cancelled && (
            <button className={btn} disabled={pending} onClick={() => run(() => setBookingStatus(booking.id, "pending"))}>Volver a pendiente</button>
          )}
        </div>
      </section>

      {/* Datos */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold uppercase">Datos de la reserva</h2>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => updateBooking(booking.id, { name, phone, mode, players, notes }));
          }}
        >
          <label className="flex flex-col gap-1 text-sm">Nombre y apellido
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} disabled={cancelled} maxLength={100} required />
          </label>
          <label className="flex flex-col gap-1 text-sm">Teléfono
            <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={cancelled} inputMode="tel" required />
          </label>
          <label className="flex flex-col gap-1 text-sm">Modalidad
            <select className={field} value={mode} onChange={(e) => setMode(e.target.value as "individual" | "group")} disabled={cancelled}>
              <option value="individual">Individual</option>
              <option value="group">Cancha completa (grupo)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">Jugadores
            <input className={field} type="number" min={1} max={maxPlayers} value={players} onChange={(e) => setPlayers(Number(e.target.value))} disabled={cancelled} required />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">Notas
            <textarea className={cn(field, "h-24 py-2")} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={cancelled} maxLength={500} />
          </label>
          <p className="text-xs text-muted sm:col-span-2">Si cambiás la modalidad o los jugadores, el total se recalcula con los precios actuales.</p>
          <div className="sm:col-span-2">
            <button type="submit" disabled={pending || cancelled} className="h-11 rounded-xl bg-lime px-6 text-sm font-bold uppercase tracking-wide text-black disabled:opacity-50">
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>

      {/* Reprogramar */}
      {!cancelled && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold uppercase">Reprogramar</h2>
          <label className="flex max-w-xs flex-col gap-1 text-sm">Nueva fecha
            <input className={field} type="date" min={today} value={date} onChange={(e) => fetchSlots(e.target.value)} />
          </label>
          <div className="mt-3">
            {slotsLoading && <p className="text-sm text-muted">Buscando horarios…</p>}
            {slots && slots.length === 0 && <p className="text-sm text-muted">Ese día no hay horarios (cerrado).</p>}
            {slots && slots.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {slots.map((s) => {
                  const current = s.start === booking.startAt;
                  const usable = !current && (s.state === "available" || (s.state === "partial" && mode === "individual" && s.spotsLeft >= players));
                  return (
                    <button
                      key={s.start}
                      type="button"
                      disabled={!usable || pending}
                      onClick={() => run(() => rescheduleBooking(booking.id, date, s.start), () => setSlots(null))}
                      className={cn("rounded-xl border px-3 py-2 text-left text-sm transition", usable ? "border-lime-ink/40 hover:bg-lime/15" : "border-border text-muted opacity-60")}
                    >
                      <span className="block font-semibold">{time(s.start)}–{time(s.end)}</span>
                      <span className="block text-xs">
                        {current ? "Horario actual" : s.state === "available" ? "Libre" : s.state === "partial" ? `${s.spotsLeft} lugares` : s.state === "past" ? "Pasado" : s.state === "blocked" ? "Bloqueado" : "Completo"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {!slots && !slotsLoading && <p className="text-sm text-muted">Elegí una fecha para ver los horarios disponibles.</p>}
          </div>
        </section>
      )}

      {/* Cancelar */}
      {!cancelled && (
        <section className="rounded-2xl border border-danger/40 p-4">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold uppercase text-danger">Cancelar reserva</h2>
          {!confirmCancel ? (
            <button className={cn(btn, "border-danger/50 text-danger hover:border-danger")} onClick={() => setConfirmCancel(true)}>Cancelar esta reserva…</button>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">Motivo (opcional)
                <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button className="h-11 rounded-xl bg-danger px-5 text-sm font-bold text-white disabled:opacity-50" disabled={pending} onClick={() => run(() => cancelBooking(booking.id, reason), () => setConfirmCancel(false))}>
                  Sí, cancelar y liberar el horario
                </button>
                <button className={btn} onClick={() => setConfirmCancel(false)}>No, volver</button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
