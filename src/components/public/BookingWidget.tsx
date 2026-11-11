"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { checkBookingStatus, createBooking, joinWaitingList, saveCustomerPush } from "@/app/reservar/actions";
import { addDaysKey, addMonths, formatDateLong, formatDateShort, formatTime } from "@/lib/datetime";
import { cn, formatMoney } from "@/lib/utils";
import { normalizePhone } from "@/validations/booking";
import type { PublicVenue } from "@/queries/venue";
import type { CreatedBooking } from "@/services/booking";
import type { Database } from "@/types/database";
import { BookingCalendar, type MonthDay } from "./BookingCalendar";
import { scrollToEl } from "@/lib/scroll";

type Slot = Database["public"]["Functions"]["get_day_availability"]["Returns"][number];
type Step = "pick" | "details" | "confirm" | "done";

const inputClass =
  "h-12 w-full rounded-xl glass-input px-4 text-base text-foreground outline-none transition placeholder:text-muted/60 focus:border-lime focus:ring-2 focus:ring-lime/30";

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

  const [courtId, setCourtId] = useState(venue.courtId);
  const courtName = venue.courts.length > 1 ? (venue.courts.find((c) => c.id === courtId)?.name ?? null) : null;
  const [step, setStepState] = useState<Step>("pick");
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const rootRef = useRef<HTMLDivElement>(null);
  const firstStep = useRef(true);
  const ORDER: Record<Step, number> = { pick: 0, details: 1, confirm: 2, done: 3 };
  function setStep(next: Step) {
    setDir(ORDER[next] >= ORDER[step] ? "fwd" : "back");
    setStepState(next);
  }
  // Al cambiar de paso, el scroll lleva suavemente al inicio del formulario
  useEffect(() => {
    if (firstStep.current) { firstStep.current = false; return; }
    scrollToEl(rootRef.current, -96);
  }, [step]);
  const [view, setView] = useState({ year: ty, month: tm });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [waitSlot, setWaitSlot] = useState<string | null>(null);
  const [wName, setWName] = useState("");
  const [wPhone, setWPhone] = useState("");
  const [wBusy, setWBusy] = useState(false);
  const [wMsg, setWMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState<CreatedBooking | null>(null);
  const [submitting, startSubmit] = useTransition();

  // ---- Pantalla de espera: si el predio confirma (o rechaza) mientras el cliente mira, se actualiza sola
  const [justConfirmed, setJustConfirmed] = useState(false);
  const watching = step === "done" && done?.status === "pending" ? done : null;
  useEffect(() => {
    if (!watching) return;
    let stop = false;
    const check = async () => {
      if (stop || document.hidden) return;
      const st = await checkBookingStatus(watching.code, watching.customerPhone);
      if (stop || !st || st === "pending") return;
      stop = true;
      setDone((d) => (d ? { ...d, status: st } : d));
      if (st === "confirmed") {
        setJustConfirmed(true);
        try { navigator.vibrate?.([120, 60, 220]); } catch { /* sin vibración */ }
      }
    };
    const id = window.setInterval(check, 6000);
    const onVis = () => { if (!document.hidden) void check(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [watching]);

  // ---- Disponibilidad del mes
  const monthKey = `${view.year}-${view.month}-${refreshTick}`;
  const [monthState, setMonthState] = useState<{ key: string; days: Record<string, MonthDay>; failed: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("get_month_availability", { p_court_id: courtId, p_year: view.year, p_month: view.month })
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
  }, [supabase, courtId, view.year, view.month, monthKey]);
  const monthDays = monthState?.key === monthKey ? monthState.days : null;
  const monthFailed = monthState?.key === monthKey && monthState.failed;

  // ---- Horarios del día
  const dayKey = selectedDate ? `${selectedDate}-${refreshTick}` : null;
  const [dayState, setDayState] = useState<{ key: string; slots: Slot[]; failed: boolean } | null>(null);
  useEffect(() => {
    if (!selectedDate || !dayKey) return;
    let cancelled = false;
    supabase.rpc("get_day_availability", { p_court_id: courtId, p_date: selectedDate }).then(({ data, error }) => {
      if (cancelled) return;
      setDayState({ key: dayKey, slots: data ?? [], failed: !!error });
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, courtId, selectedDate, dayKey]);
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
    setWaitSlot(null);
    setSlotStart(null);
    setNotice(null);
  }

  function pickSlot(s: Slot) {
    if (s.state === "full") {
      setWaitSlot(s.slot_start);
      setWMsg(null);
      return;
    }
    setWaitSlot(null);
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
        courtId,
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
    const cancelled = done.status === "cancelled";
    return (
      <div ref={rootRef} className={cn("step-enter done-card glass rounded-[2rem] p-6 sm:p-8", cancelled ? "glass-danger" : "glass-lime", justConfirmed && "confirmed-flash")}>
        {justConfirmed && (
          <p role="status" className="confirmed-banner mb-5 rounded-xl bg-lime px-4 py-3 text-center font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-black">
            ¡El predio confirmó tu turno!
          </p>
        )}
        <div className="flex flex-col items-center text-center">
          <SuccessMark key={done.status} kind={pending ? "pending" : cancelled ? "no" : "ok"} />
          <h3 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">
            {pending ? "Reserva recibida" : cancelled ? "Reserva no confirmada" : "¡Reserva confirmada!"}
          </h3>
          <p className="mt-2 text-muted">
            {pending
              ? "Tu turno quedó pendiente: el predio te va a confirmar."
              : cancelled
                ? "El predio no pudo confirmar este turno. Comunicate con ellos o elegí otro horario."
                : "Tu turno quedó guardado. ¡Te esperamos!"}
          </p>
          {pending && <NotifyMe code={done.code} phone={done.customerPhone} />}
          {pending && (
            <p className="wait-dots mt-4 inline-flex items-center gap-2 rounded-full bg-lime/15 px-4 py-2 text-sm font-semibold text-lime-ink" role="status">
              <span className="wait-ball" aria-hidden /> Esperando la confirmación del predio<span aria-hidden className="wait-dot">.</span><span aria-hidden className="wait-dot">.</span><span aria-hidden className="wait-dot">.</span>
            </p>
          )}
          <div className="mt-6 rounded-2xl border border-dashed border-lime/50 bg-lime/10 px-8 py-4">
            <p className="text-xs uppercase tracking-widest text-muted">Código de reserva</p>
            <p className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-widest text-lime-ink">
              {done.code}
            </p>
          </div>
          <p className="mt-2 text-xs text-muted">Guardá este código: con él y tu teléfono podés <a href="/mi-reserva" className="underline">consultar o cancelar tu reserva</a>.</p>
        </div>

        <dl className="mx-auto mt-6 max-w-sm space-y-2 text-sm">
          <Row label="A nombre de" value={done.customerName} />
          <Row label="Fecha" value={formatDateShort(done.startAt, tz)} />
          <Row label="Horario" value={`${formatTime(done.startAt, tz)} a ${formatTime(done.endAt, tz)}`} />
          <Row label="Cancha" value={`${courtName ? `${courtName} · ` : ""}Completa · hasta ${done.players} jugadores`} />
          <Row label="Total a pagar" value={formatMoney(done.totalPrice, venue.currency)} strong />
        </dl>
        <p className="mt-4 text-center text-sm text-muted">El pago se realiza en el predio, entre todos los jugadores.</p>

        {venue.contactWhatsapp && /^\+?[0-9]{8,15}$/.test(venue.contactWhatsapp.replace(/\D/g, "")) && (
          <a
            href={`https://wa.me/${venue.contactWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
              [
                `¡Hola! Reservé un turno en ${venue.name} ✅`,
                ``,
                `👤 A nombre de: ${done.customerName}`,
                `📅 Día: ${formatDateShort(done.startAt, tz)}`,
                `🕐 Horario: ${formatTime(done.startAt, tz)} a ${formatTime(done.endAt, tz)} hs`,
                `⚽ ${courtName ? `${courtName} · ` : ""}Cancha de fútbol 5 completa (hasta ${done.players} jugadores)`,
                `🔖 Código de reserva: ${done.code}`,
              ].join("\n"),
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto mt-4 flex h-12 w-fit items-center rounded-xl bg-lime px-6 font-semibold text-black transition hover:bg-lime-dark"
          >
            Enviar mi reserva al predio por WhatsApp
          </a>
        )}

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
    <div ref={rootRef} data-dir={dir} className="glass glass-clear rounded-[2rem] p-5 sm:p-8">
      <ol className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] transition-all duration-500",
                i <= stepIndex ? "bg-lime text-black" : "bg-white/10 text-muted",
                i === stepIndex && "step-dot-active",
              )}
            >
              {i + 1}
            </span>
            <span className={cn("hidden sm:inline", i === stepIndex ? "text-foreground" : "text-muted")}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="step-line h-px flex-1 bg-border"><i style={{ transform: `scaleX(${i < stepIndex ? 1 : 0})` }} /></span>}
          </li>
        ))}
      </ol>

      {notice && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertCircle size={18} className="mt-0.5 shrink-0" /> {notice}
        </p>
      )}

      {step === "pick" && venue.courts.length > 1 && (
        <div role="radiogroup" aria-label="Elegí la cancha" className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Cancha:</span>
          {venue.courts.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={c.id === courtId}
              onClick={() => {
                setCourtId(c.id);
                setSlotStart(null);
                setNotice(null);
              }}
              className={cn(
                "h-11 rounded-xl border px-4 text-sm font-semibold transition",
                c.id === courtId ? "border-lime bg-lime text-black" : "border-border hover:border-lime",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {step === "pick" && (
        <div key="pick" className="step-enter grid gap-8 md:grid-cols-2">
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
                  <div key={i} className="skeleton h-16 rounded-xl bg-surface-2" style={{ animationDelay: `${i * 80}ms` }} />
                ))}
              </div>
            )}
            {dayFailed && <p className="mt-3 text-sm text-danger">No pudimos cargar los horarios. Probá de nuevo.</p>}
            {slots && slots.length === 0 && <p className="mt-3 text-sm text-muted">No hay turnos para este día.</p>}

            {slots && slots.length > 0 && (
              <>
                <div key={selectedDate} className="mt-4 grid grid-cols-2 gap-2">
                  {slots.map((s, idx) => {
                    const bookable = s.state === "available";
                    const isSel = s.slot_start === slotStart;
                    const pending = bookable && s.has_pending;
                    return (
                      <button
                        key={s.slot_start}
                        type="button"
                        disabled={!bookable && s.state !== "full"}
                        aria-pressed={isSel}
                        onClick={() => pickSlot(s)}
                        style={{ "--i": idx } as React.CSSProperties}
                        className={cn(
                          "slot-in glass-cell flex h-16 flex-col items-center justify-center rounded-xl border px-2 text-center transition duration-200 active:scale-95",
                          isSel && "slot-sel",
                          bookable && !isSel && !pending && "border-lime/45 bg-gradient-to-br from-lime/30 to-lime/5 hover:from-lime/45",
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
                          {s.state === "full" && "Ocupado · lista de espera"}
                          {s.state === "blocked" && "No disponible"}
                          {s.state === "past" && "Finalizado"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {waitSlot && (() => {
                  const ws = slots.find((x) => x.slot_start === waitSlot);
                  if (!ws) return null;
                  return (
                    <form
                      className="glass-soft mt-4 flex flex-col gap-3 rounded-2xl p-4"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setWBusy(true);
                        setWMsg(null);
                        const r = await joinWaitingList({ courtId, startAt: ws.slot_start, name: wName, phone: wPhone });
                        setWBusy(false);
                        setWMsg(r.ok ? { ok: true, text: "¡Listo! Te anotamos. Si se libera el turno, el predio te avisa por WhatsApp." } : { ok: false, text: r.error });
                        if (r.ok) { setWName(""); setWPhone(""); }
                      }}
                    >
                      <p className="text-sm">Turno <strong>{formatTime(ws.slot_start, tz)} a {formatTime(ws.slot_end, tz)}</strong> ocupado. Dejá tus datos y, si se libera, te avisamos.</p>
                      <input className="h-12 rounded-xl glass-input px-3 text-base" placeholder="Nombre y apellido" value={wName} onChange={(e) => setWName(e.target.value)} maxLength={100} required />
                      <input className="h-12 rounded-xl glass-input px-3 text-base" type="tel" inputMode="tel" placeholder="WhatsApp (con código de área)" value={wPhone} onChange={(e) => setWPhone(e.target.value)} required />
                      {wMsg && <p role={wMsg.ok ? "status" : "alert"} className={cn("text-sm", wMsg.ok ? "text-lime-ink" : "text-danger")}>{wMsg.text}</p>}
                      <div className="flex gap-2">
                        <button type="submit" disabled={wBusy} className="h-11 flex-1 rounded-xl bg-lime font-semibold text-black disabled:opacity-60">{wBusy ? "Anotando…" : "Anotarme en la lista de espera"}</button>
                        <button type="button" onClick={() => setWaitSlot(null)} className="h-11 rounded-xl border border-border px-4 font-semibold">Cerrar</button>
                      </div>
                    </form>
                  );
                })()}
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
              className={cn("mt-6 h-14 w-full rounded-2xl bg-lime font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-wide text-black transition enabled:hover:bg-lime-dark disabled:cursor-not-allowed disabled:opacity-40", slot && "cta-ready")}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === "details" && slot && selectedDate && (
        <div key="details" className="step-enter mx-auto max-w-lg">
          <BackButton onClick={() => setStep("pick")} />
          <p className="mt-3 rounded-xl bg-lime/10 px-4 py-3 text-sm">
            <span className="font-semibold">{formatDateLong(selectedDate)}</span> · {range}
          </p>

          <div className="glass-soft mt-5 rounded-2xl p-4 text-sm">
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
        <div key="confirm" className="step-enter mx-auto max-w-lg">
          <BackButton onClick={() => setStep("details")} />
          <h3 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold uppercase">Confirmá tu reserva</h3>

          <dl className="glass-soft mt-4 space-y-3 rounded-2xl p-5 text-sm">
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
            className="lg-btn relative mt-6 h-14 w-full overflow-hidden rounded-2xl bg-lime font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-wide text-black transition enabled:hover:bg-lime-dark disabled:cursor-wait"
            data-pending={submitting || undefined}
          >
            {submitting ? (
              <span className="inline-flex items-center justify-center gap-3">
                <span className="lg-ball" aria-hidden /> Reservando tu turno…
              </span>
            ) : (
              "Confirmar reserva"
            )}
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




function SuccessMark({ kind }: { kind: "pending" | "ok" | "no" }) {
  return (
    <div className="success-mark relative flex h-28 w-28 items-center justify-center" aria-hidden>
      <span className="success-ring" />
      <span className="success-ring" style={{ animationDelay: "0.7s" }} />
      {kind === "ok" && Array.from({ length: 14 }, (_, i) => (
        <span key={i} className="confetti" style={{ "--a": `${(360 / 14) * i}deg`, "--d": `${0.55 + (i % 4) * 0.08}s` } as React.CSSProperties} />
      ))}
      <svg viewBox="0 0 52 52" className="relative h-24 w-24 text-lime-ink">
        <circle className="success-circle" cx="26" cy="26" r="23" fill="none" stroke="currentColor" strokeWidth="3" />
        {kind === "no" ? (
          <path className="success-check" d="M18 18 L34 34 M34 18 L18 34" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        ) : kind === "pending" ? (
          <path className="success-check" d="M26 14 V27 L34 32" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path className="success-check" d="M15 27 l7 7 l15 -16" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </div>
  );
}


const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
function toKey(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Botón para recibir una notificación en el celular cuando el predio confirme (aunque cierre la página). */
function NotifyMe({ code, phone }: { code: string; phone: string }) {
  const [state, setState] = useState<"hidden" | "off" | "busy" | "on" | "denied" | "error" | "ios" | "unsupported">("hidden");
  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!VAPID;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    // Se muestra tras montar para no desajustar el HTML del servidor
    const t = window.setTimeout(
      () => setState(!ok ? (ios ? "ios" : "unsupported") : Notification.permission === "denied" ? "denied" : "off"),
      0,
    );
    return () => window.clearTimeout(t);
  }, []);
  async function enable() {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID) }));
      const r = await saveCustomerPush(code, phone, sub.toJSON());
      setState(r.ok ? "on" : "error");
    } catch {
      setState("error");
    }
  }
  if (state === "hidden") return null;
  if (state === "on") return <p className="mt-4 text-sm font-medium text-lime-ink" role="status">🔔 Listo: te avisamos al celular apenas el predio confirme.</p>;
  if (state === "ios") return <p className="mt-4 max-w-sm text-sm text-muted">Para recibir el aviso en iPhone, abrí este sitio desde Safari, tocá Compartir → «Agregar a pantalla de inicio», abrilo desde ese ícono y volvé a reservar. Mientras tanto, dejá esta pantalla abierta: se actualiza sola.</p>;
  if (state === "unsupported") return <p className="mt-4 max-w-sm text-sm text-muted">Este navegador no permite avisos al celular. Probá abrir el sitio en Chrome. Mientras tanto, dejá esta pantalla abierta: se actualiza sola.</p>;
  if (state === "denied") return <p className="mt-4 max-w-sm text-sm text-muted">Las notificaciones están bloqueadas en este navegador. Podés seguir esta pantalla abierta o consultar en «Mi reserva».</p>;
  return (
    <div className="mt-4">
      <button type="button" onClick={enable} disabled={state === "busy"} className="h-11 rounded-xl border border-lime bg-lime/15 px-5 text-sm font-semibold text-lime-ink transition hover:bg-lime/30 disabled:opacity-60">
        {state === "busy" ? "Activando…" : "🔔 Avisarme al celular cuando me confirmen"}
      </button>
      {state === "error" && <p role="alert" className="mt-2 text-sm text-danger">No se pudo activar el aviso. Probá de nuevo.</p>}
    </div>
  );
}
