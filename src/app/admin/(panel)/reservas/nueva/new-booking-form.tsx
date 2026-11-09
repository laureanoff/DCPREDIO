"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createManualBooking, loadSlots, type SlotOption } from "../actions";
import { cn } from "@/lib/utils";

const field = "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";
const time = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Cordoba", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

export function NewBookingForm({ courts, today, initialDate }: { courts: { id: string; name: string }[]; today: string; initialDate: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState<SlotOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchSlots(c: string, d: string) {
    setSlot("");
    setSlots(null);
    if (!c || !d) return;
    setLoading(true);
    const r = await loadSlots(c, d);
    setLoading(false);
    if (r.ok) setSlots(r.slots);
    else setError(r.error);
  }

  // Primera carga de horarios.
  const [started, setStarted] = useState(false);
  if (!started && courtId) {
    setStarted(true);
    void fetchSlots(courtId, date);
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!slot) return setError("Elegí un horario.");
        start(async () => {
          const r = await createManualBooking({ courtId, slotStart: slot, name, phone, notes, status: confirmed ? "confirmed" : "pending" });
          if (!r.ok) {
            setError(r.error);
            void fetchSlots(courtId, date);
            return;
          }
          router.push(`/admin/reservas/${r.id}`);
        });
      }}
    >
      {error && <p role="alert" className="rounded-xl border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {courts.length > 1 && (
        <label className="flex flex-col gap-1 text-sm">Cancha
          <select className={field} value={courtId} onChange={(e) => { setCourtId(e.target.value); void fetchSlots(e.target.value, date); }}>
            {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">Fecha
        <input type="date" className={field} min={today} value={date} onChange={(e) => { setDate(e.target.value); void fetchSlots(courtId, e.target.value); }} required />
      </label>

      <div>
        <p className="mb-2 text-sm">Horario</p>
        {loading && <p className="text-sm text-muted">Cargando horarios…</p>}
        {slots && slots.length === 0 && <p className="text-sm text-muted">Ese día no hay turnos (cerrado o feriado).</p>}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots?.map((s) => {
            const free = s.state === "available";
            return (
              <button
                key={s.start}
                type="button"
                disabled={!free}
                onClick={() => setSlot(s.start)}
                aria-pressed={slot === s.start}
                className={cn(
                  "h-11 rounded-xl border text-sm font-semibold transition",
                  slot === s.start ? "border-lime bg-lime text-black" : "border-border hover:border-lime",
                  !free && "cursor-not-allowed opacity-40 line-through",
                )}
              >
                {time(s.start)}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">Nombre y apellido
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">Teléfono / WhatsApp
        <input className={field} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+5493511234567" required />
      </label>
      <label className="flex flex-col gap-1 text-sm">Notas (opcional)
        <textarea className={cn(field, "h-20 py-2")} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </label>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-[var(--lime)]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        Dejarla confirmada (si no, queda pendiente)
      </label>

      <button type="submit" disabled={pending || !slot} className="h-12 rounded-xl bg-lime font-semibold text-black disabled:opacity-50">
        {pending ? "Guardando…" : "Cargar reserva"}
      </button>
    </form>
  );
}
