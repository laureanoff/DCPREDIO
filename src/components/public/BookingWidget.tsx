"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { createBooking } from "@/app/reservar/actions";
import { addDaysKey, addMonths, formatDateLong, formatDateShort, formatTime } from "@/lib/datetime";
import { cn, formatMoney } from "@/lib/utils";
import { normalizePhone } from "@/validations/booking";
import type { PublicVenue } from "@/queries/venue";
import type { CreatedBooking } from "@/services/booking";
import type { Database } from "@/types/database";
import { BookingCalendar, type MonthDay } from "./BookingCalendar";

type Slot = Database["public"]["Functions"]["get_day_availability"]["Returns"][number];
type Step = "pick" | "details" | "confirm" | "done";

const inputClass =
  "h-12 w-full rounded-xl border border-border bg-surface-2 px-4 text-base text-foreground outline-none transition placeholder:text-muted/60 focus:border-lime focus:ring-2 focus:ring-lime/30";

const STEPS: { id: Step; label: string }[] = [
  { id: "pick", label: "Fecha y hora" },
  { id: "details", label: "Tus datos" },
  { id: "confirm", label: "Confirmar" },
];

export function BookingWidget({ venue, today }: { venue: PublicVenue; today: string }) {
  const supabase = useMemo(() => createClient(), []);
  const tz = venue.timezone;
  const maxDate = addDaysKey(today, venue.bookingWindowDays);
  const [ty, tm] = today.split("-").map(Number);

  const [step, setStep] = useState<Step>("pick");
  const [view, setView] = useState({ year: ty, month: tm });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState<CreatedBooking | null>(null);
  const [submitting, startSubmit] = useTransition();

  // ---- Disponibilidad del mes
  const monthKey = `${view.year}-${view.month}-${refreshTick}`;
  const [monthState, setMonthState] = useState<{ key: string; days: Record<string, MonthDay>; failed: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("get_month_availability", { p_court_id: venue.courtId, p_year: view.year, p_month: view.month })
      .then(({ data, error }) => {
        if (cancelled) return;
        setMonthState({
          key: monthKey,
          days: Object.fromEntries((data ?? []).map((d) => [d.day, d])),
          failed: !!error,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, venue.courtId, view.year, view.month, monthKey]);
  const monthDays = monthState?.key === monthKey ? monthState.days : null;
  const monthFailed = monthState?.key === monthKey && monthState.failed;

  // ---- Horarios del día
  const dayKey = selectedDate ? `${selectedDate}-${refreshTick}` : null;
  const [dayState, setDayState] = useState<{ key: string; slots: Slot[]; failed: boolean } | null>(null);
  useEffect(() => {
    if (!selectedDate || !dayKey) return;
    let cancelled = false;
    supabase.rpc("get_day_availability", { p_court_id: venue.courtId, p_date: selectedDate }).then(({ data, error }) => {
      if (cancelled) return;
      setDayState({ key: dayKey, slots: data ?? [], failed: !!error });
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, venue.courtId, selectedDate, dayKey]);
  const slots = dayState && dayState.key === dayKey ? dayState.slots : null;
  const dayFailed = dayState?.key === dayKey && dayState.failed;

  const slot = slots?.find((s) => s.slot_start === slotStart) ?? null;
  // Cada reserva es el turno completo de la cancha, para hasta `maxPlayers` jugadores.
  const slotFree = slot?.state === "available";
  const total = venue.priceGroup;
  const perPlayer = venue.maxPlayers > 0 ? Math.round(total / venue.maxPlayers) : total;
  const range = slot ? `${formatTime(slot.slot_start, tz)} a ${formatTime(slot.slot_end, tz)}` : "";

  const prev = addMonths(view.year, view.month, -1);
  const next = addMonths(view.year, view.month, 1);
  const canPrev = view.year * 12 + view.month > ty * 12 + tm;
  const canNext = `${next.year}-${String(next.month).padStart(2, "0")}-01` <= maxDate;

  function pickDate(key: string) {
    setSelectedDate(key);
    setSlotStart(null);
    setNotice(null);
  }

  function pickSlot(s: Slot) {
    setSlotStart(s.slot_start);
    setNotice(null);
  }

  function validateDetails(): string | null {
    if (name.trim().length < 2) return "Ingresá tu nombre y apellido.";
    if (!/^\+?[0-9]{8,15}$/.test(normalizePhone(phone))) return "Ingresá un teléfono válido, con código de área.";
    if (!slotFree) return "Este turno ya no está disponible.";
    return null;
  }

  function goDetails() {
    if (!slot) return;
    setFormError(null);
    setStep("details");
  }

  function goConfirm() {
    const err = validateDetails();
    setFormError(err);
    if (!err) setStep("confirm");
  }

  function confirm() {
    if (!slot) return;
    setFormError(null);
    startSubmit(async () => {
      const res = await createBooking({
        courtId: venue.courtId,
        startAt: slot.slot_start,
        name,
        phone,
        notes: notes || undefined,
        website: website || undefined,
      });
      if (res.ok) {
        setDone(res.booking);
        setStep("done");
        setRefreshTick((t) => t + 1);
        return;
      }
      if (res.refresh) {
        setNotice(res.error);
        setSlotStart(null);
        setStep("pick");
        setRefreshTick((t) => t + 1);
      } else {
        setFormError(res.error);
      }
    });
  }

  function reset() {
    setStep("pick");
    setSelectedDate(null);
    setSlotStart(null);
    setDone(null);
    setName("");
    setPhone("");
    setNotes("");
    setFormError(null);
    setNotice(null);
    setRefreshTick((t) => t + 1);
  }

  // ---------------- Pantalla de confirmación
  if (step === "done" && done) {
    const pending = done.status === "pending";
    return (
      <div className="rounded-3xl border border-lime/40 bg-surface p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 size={56} className="text-lime-ink" />
          <h3 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">
            {pending ? "Reserva recibida" : "¡Reserva confirmada!"}
          </h3>
          <p className="mt-2 text-muted">
            {pending
              ? "Tu turno quedó pendiente: el predio te va a confirmar."
              : "Tu turno quedó guardado. ¡Te esperamos!"}
          </p>
          <div className="mt-6 rounded-2xl border border-dashed border-lime/50 bg-lime/10 px-8 py-4">
            <p className="text-xs uppercase tracking-widest text-muted">Código de reserva</p>
            <p className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-widest text-lime-ink">
              {done.code}
            </p>
          </div>
          <p className="mt-2 text-xs text-muted">Guardá este código por cualquier consulta.</p>
        </div>

        <dl className="mx-auto mt-6 max-w-sm space-y-2 text-sm">
          <Row label="A nombre de" value={done.customerName} />
          <Row label="Fecha" value={formatDateShort(done.startAt, tz)} />
          <Row label="Horario" value={`${formatTime(done.startAt, tz)} a ${formatTime(done.endAt, tz)}`} />
          <Row label="Cancha" value={`Completa · hasta ${done.players} jugadores`} />
          <Row label="Total a pagar" value={formatMoney(done.totalPrice, venue.currency)} strong />
        </dl>
        <p className="mt-4 text-center text-sm text-muted">El pago se realiza en el predio, entre todos los jugadores.</p>

        <button
          type="button"
          onClick={reset}
          className="mx-auto mt-6 flex h-12 items-center rounded-xl border border-border px-6 font-medium transition hover:border-lime hover:text-lime-ink"
        >
          Hacer otra reserva
        </button>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 sm:p-8">
      <ol className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px]",
                i <= stepIndex ? "bg-lime text-black" : "bg-surface-2 text-muted",
              )}
            >
              {i + 1}
            </span>
            <span className={cn("hidden sm:inline", i === stepIndex ? "text-foreground" : "text-muted")}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      {notice && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /> {notice}
        </p>
      )}

      {step === "pick" && (
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <BookingCalendar
              year={view.year}
              month={view.month}
              days={monthDays}
              today={today}
              maxDate={maxDate}
              selected={selectedDate}
              canPrev={canPrev}
              canNext={canNext}
              onPrev={() => setView({ year: prev.year, month: prev.month })}
              onNext={() => setView({ year: next.year, month: next.month })}
              onSelect={pickDate}
            />
            {monthFailed && <p className="mt-3 text-sm text-danger">No pudimos cargar la disponibilidad. Recargá la página.</p>}
          </div>

          <div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-wide">
              {selectedDate ? formatDateLong(selectedDate) : "Elegí un día"}
            </h3>

            {!selectedDate && <p className="mt-2 text-sm text-muted">Seleccioná una fecha del calendario para ver los horarios.</p>}
            {selectedDate && slots === null && !dayFailed && (
              <div className="mt-4 grid grid-cols-2 gap-2" aria-busy>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />
                ))}
              </div>
            )}
            {dayFailed && <p className="mt-3 text-sm text-danger">No pudimos cargar los horarios. Probá de nuevo.</p>}
            {slots && slots.length === 0 && <p className="mt-3 text-sm text-muted">No hay turnos para este día.</p>}

            {slots && slots.length > 0 && (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {slots.map((s) => {
                    const bookable = s.state === "available";
                    const isSel = s.slot_start === slotStart;
                    const pending = bookable && s.has_pending;
                    return (
                      <button
                        key={s.slot_start}
                        type="button"
                        disabled={!bookable}
                        aria-pressed={isSel}
                        onClick={() => pickSlot(s)}
                        className={cn(
                          "flex h-16 flex-col items-center justify-center rounded-xl border px-2 text-center transition",
                          bookable && !isSel && !pending && "border-lime/40 bg-lime/10 hover:bg-lime/25",
                          bookable && !isSel && pending && "border-warning/50 bg-warning/10 hover:bg-warning/20",
                          isSel && "border-lime bg-lime text-black",
                          s.state === "full" && "border-danger/30 bg-danger/10 text-danger/80",
                          s.state === "blocked" && "border-transparent bg-surface-2 text-muted",
                          s.state === "past" && "border-transparent bg-surface-2/50 text-muted/40",
                        )}
                      >
                        <span className="font-[family-name:var(--font-display)] text-xl font-bold leading-none">
                          {formatTime(s.slot_start, tz)} – {formatTime(s.slot_end, tz)}
                        </span>
                        <span className={cn("mt-1 text-[11px] font-medium", !isSel && "opacity-80")}>
                          {s.state === "available" && (pending ? "Pendiente de confirmación" : "Disponible")}
                          {s.state === "full" && "Ocupado"}
                          {s.state === "blocked" && "No disponible"}
                          {s.state === "past" && "Finalizado"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-lime/70" /> Disponible</li>
                  <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-warning/70" /> Pendiente</li>
                  <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-danger/60" /> Ocupado</li>
                  <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-surface-2 ring-1 ring-border" /> No disponible</li>
                </ul>
              </>
            )}

            <button
              type="button"
              disabled={!slot}
              onClick={goDetails}
              className="mt-6 h-14 w-full rounded-2xl bg-lime font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-wide text-black transition enabled:hover:bg-lime-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === "details" && slot && selectedDate && (
        <div className="mx-auto max-w-lg">
          <BackButton onClick={() => setStep("pick")} />
          <p className="mt-3 rounded-xl bg-lime/10 px-4 py-3 text-sm">
            <span className="font-semibold">{formatDateLong(selectedDate)}</span> · {range}
          </p>

          <div className="mt-5 rounded-2xl border border-border bg-surface-2 p-4 text-sm">
            <p className="font-semibold">Turno completo de la cancha</p>
            <p className="mt-1 text-muted">
              Reservás para todo el grupo (hasta {venue.maxPlayers} jugadores). Precio del turno{" "}
              <span className="font-semibold text-foreground">{formatMoney(venue.priceGroup, venue.currency)}</span>
              {venue.maxPlayers > 1 && <> · unos {formatMoney(perPlayer, venue.currency)} por jugador</>}.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">Nombre y apellido</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">Teléfono / WhatsApp (con código de área)</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="351 1234567"
                maxLength={25}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">Observaciones (opcional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
                className={cn(inputClass, "h-auto py-3")}
              />
            </label>
            {/* Honeypot anti-bots: invisible para personas */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                No completar
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
            </div>
          </div>

          {formError && <ErrorBox>{formError}</ErrorBox>}

          <button
            type="button"
            onClick={goConfirm}
            className="mt-6 h-14 w-full rounded-2xl bg-lime font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-wide text-black transition hover:bg-lime-dark"
          >
            Revisar reserva
          </button>
        </div>
      )}

      {step === "confirm" && slot && selectedDate && (
        <div className="mx-auto max-w-lg">
          <BackButton onClick={() => setStep("details")} />
          <h3 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold uppercase">Confirmá tu reserva</h3>

          <dl className="mt-4 space-y-3 rounded-2xl border border-border bg-surface-2 p-5 text-sm">
            <Row label="Responsable" value={name.trim()} />
            <Row label="Teléfono" value={normalizePhone(phone)} />
            <Row label="Fecha" value={formatDateLong(selectedDate)} />
            <Row label="Horario" value={range} />
            <Row label="Cancha" value={`Completa · hasta ${venue.maxPlayers} jugadores`} />
            {notes.trim() && <Row label="Observaciones" value={notes.trim()} />}
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-medium">Total a pagar</dt>
              <dd className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-lime-ink">
                {formatMoney(total, venue.currency)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-muted">
            El pago se realiza en el predio, entre todos los jugadores.
            {venue.requireConfirmation && " Tu reserva quedará pendiente hasta que el predio la confirme."}
          </p>

          {formError && <ErrorBox>{formError}</ErrorBox>}

          <button
            type="button"
            onClick={confirm}
            disabled={submitting}
            className="mt-6 h-14 w-full rounded-2xl bg-lime font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-wide text-black transition enabled:hover:bg-lime-dark disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? "Guardando…" : "Confirmar reserva"}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("text-right", strong && "font-semibold text-lime-ink")}>{value}</dd>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
      <AlertCircle size={18} className="mt-0.5 shrink-0" /> {children}
    </p>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1.5 text-sm text-muted transition hover:text-lime-ink">
      <ArrowLeft size={16} /> Volver
    </button>
  );
}


