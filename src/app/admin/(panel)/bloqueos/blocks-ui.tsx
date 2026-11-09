"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadSlots, type SlotOption } from "../reservas/actions";
import { createBlock, deleteBlock, deleteSpecialDay, saveSpecialDay } from "./actions";
import { cn } from "@/lib/utils";

const field = "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";
const card = "rounded-2xl border border-border bg-surface p-4";
const h2 = "mb-3 font-[family-name:var(--font-display)] text-lg font-bold uppercase";
const tz = "America/Argentina/Cordoba";
const hhmm = (iso: string) => new Intl.DateTimeFormat("es-AR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
const dayLabel = (iso: string) => new Intl.DateTimeFormat("es-AR", { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));

type Msg = { ok: boolean; text: string } | null;
function Notice({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <p role={msg.ok ? "status" : "alert"} className={cn("rounded-xl border px-3 py-2 text-sm", msg.ok ? "border-lime-ink/40 bg-lime/10 text-lime-ink" : "border-danger/50 bg-danger/10 text-danger")}>{msg.text}</p>;
}

export function BlockForm({ courts, today }: { courts: { id: string; name: string }[]; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<SlotOption[] | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<Msg>(null);

  async function fetchSlots(c: string, d: string) {
    setFrom("");
    setTo("");
    setSlots(null);
    if (!c || !d) return;
    const r = await loadSlots(c, d);
    if (r.ok) setSlots(r.slots.filter((s) => s.state !== "past"));
    else setMsg({ ok: false, text: r.error });
  }

  const [started, setStarted] = useState(false);
  if (!started && courtId) {
    setStarted(true);
    void fetchSlots(courtId, date);
  }

  const fromIdx = slots?.findIndex((s) => s.start === from) ?? -1;
  const toOptions = fromIdx >= 0 && slots ? slots.slice(fromIdx) : [];

  return (
    <form
      className={cn(card, "flex flex-col gap-3")}
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        const last = slots?.find((s) => s.start === to);
        if (!from || !last) return setMsg({ ok: false, text: "Elegí desde y hasta qué turno bloquear." });
        start(async () => {
          const r = await createBlock({ courtId, startAt: from, endAt: last.end, reason });
          setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
          if (r.ok) { setReason(""); void fetchSlots(courtId, date); router.refresh(); }
        });
      }}
    >
      <h2 className={h2}>Nuevo bloqueo</h2>
      <Notice msg={msg} />
      {courts.length > 1 && (
        <label className="flex flex-col gap-1 text-sm">Cancha
          <select className={field} value={courtId} onChange={(e) => { setCourtId(e.target.value); void fetchSlots(e.target.value, date); }}>
            {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">Fecha
        <input type="date" min={today} className={field} value={date} onChange={(e) => { setDate(e.target.value); void fetchSlots(courtId, e.target.value); }} required />
      </label>
      {slots && slots.length === 0 ? (
        <p className="text-sm text-muted">Ese día no hay turnos para bloquear.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">Desde el turno de
            <select className={field} value={from} onChange={(e) => { setFrom(e.target.value); setTo(e.target.value); }} required>
              <option value="">Elegir…</option>
              {slots?.map((s) => <option key={s.start} value={s.start}>{hhmm(s.start)}{s.state === "blocked" ? " (ya bloqueado)" : ""}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">Hasta el turno de (inclusive)
            <select className={field} value={to} onChange={(e) => setTo(e.target.value)} required disabled={!from}>
              {toOptions.map((s) => <option key={s.start} value={s.start}>{hhmm(s.start)}</option>)}
            </select>
          </label>
        </div>
      )}
      <label className="flex flex-col gap-1 text-sm">Motivo (opcional)
        <input className={field} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Lluvia, mantenimiento, torneo…" />
      </label>
      <button type="submit" disabled={pending || !from} className="h-12 rounded-xl bg-lime font-semibold text-black disabled:opacity-50">{pending ? "Guardando…" : "Bloquear"}</button>
    </form>
  );
}

export function BlockList({ blocks, courtNames, multiCourt }: { blocks: { id: string; courtId: string; startAt: string; endAt: string; reason: string }[]; courtNames: Record<string, string>; multiCourt: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  return (
    <section className={card}>
      <h2 className={h2}>Bloqueos vigentes</h2>
      <Notice msg={msg} />
      {blocks.length === 0 ? <p className="text-sm text-muted">No hay bloqueos.</p> : (
        <ul className="mt-2 divide-y divide-border">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-semibold capitalize">{dayLabel(b.startAt)} · {hhmm(b.startAt)} a {hhmm(b.endAt)}{multiCourt ? ` · ${courtNames[b.courtId] ?? ""}` : ""}</p>
                {b.reason && <p className="text-muted">{b.reason}</p>}
              </div>
              <button disabled={pending} onClick={() => start(async () => { const r = await deleteBlock(b.id); setMsg({ ok: r.ok, text: r.ok ? r.message : r.error }); router.refresh(); })} className="h-10 shrink-0 rounded-xl border border-border px-3 font-semibold hover:border-danger disabled:opacity-50">Quitar</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SpecialDays({ days, today }: { days: { id: string; day: string; closed: boolean; open: string; close: string; note: string }[]; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [day, setDay] = useState(today);
  const [closed, setClosed] = useState(true);
  const [open, setOpen] = useState("");
  const [close, setClose] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<Msg>(null);

  return (
    <section className={card}>
      <h2 className={h2}>Feriados y días especiales</h2>
      <p className="mb-3 text-sm text-muted">Cerrá un día completo o poné un horario distinto al habitual.</p>
      <Notice msg={msg} />
      <form
        className="mt-2 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await saveSpecialDay({ day, closed, open, close, note });
            setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
            if (r.ok) { setNote(""); router.refresh(); }
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">Fecha
          <input type="date" min={today} className={field} value={day} onChange={(e) => setDay(e.target.value)} required />
        </label>
        <label className="flex items-center gap-3 self-end pb-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[var(--lime)]" checked={closed} onChange={(e) => setClosed(e.target.checked)} />
          Cerrado todo el día
        </label>
        {!closed && (
          <>
            <label className="flex flex-col gap-1 text-sm">Abre
              <input type="time" className={field} value={open} onChange={(e) => setOpen(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-sm">Cierra
              <input type="time" className={field} value={close} onChange={(e) => setClose(e.target.value)} required />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">Nota (opcional)
          <input className={field} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Feriado nacional, evento privado…" />
        </label>
        <button type="submit" disabled={pending} className="h-12 rounded-xl bg-lime font-semibold text-black disabled:opacity-50 sm:col-span-2">Guardar día especial</button>
      </form>
      {days.length > 0 && (
        <ul className="mt-4 divide-y divide-border border-t border-border">
          {days.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-semibold">{d.day.split("-").reverse().join("/")} · {d.closed ? "Cerrado" : `${d.open} a ${d.close}`}</p>
                {d.note && <p className="text-muted">{d.note}</p>}
              </div>
              <button disabled={pending} onClick={() => start(async () => { const r = await deleteSpecialDay(d.id); setMsg({ ok: r.ok, text: r.ok ? r.message : r.error }); router.refresh(); })} className="h-10 shrink-0 rounded-xl border border-border px-3 font-semibold hover:border-danger disabled:opacity-50">Quitar</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
