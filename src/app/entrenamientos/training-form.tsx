"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, Dumbbell, MapPin, Send } from "lucide-react";
import { SuccessMark } from "@/components/public/SuccessMark";
import { cn, formatMoney } from "@/lib/utils";
import { BILLING_LABEL, BILLING_ORDER, BILLING_SUFFIX, WEEKDAYS, type Billing } from "@/lib/training";
import type { PublicActivity } from "@/queries/trainings";
import { checkEnrollmentStatus, enroll, type EnrollmentLive } from "./actions";

const input = "h-12 w-full rounded-xl glass-input px-3.5 text-base outline-none transition placeholder:text-muted/70 focus:border-lime focus:ring-2 focus:ring-lime/30";
const label = "flex flex-col gap-1.5 text-sm font-medium";

export function TrainingForm({ catalog }: { catalog: PublicActivity[] }) {
  const [actId, setActId] = useState(catalog[0]?.id ?? "");
  const act = catalog.find((a) => a.id === actId) ?? catalog[0];
  const [packId, setPackId] = useState<string | null>(null);
  const pack = act?.packs.find((p) => p.id === packId) ?? null;
  const [billing, setBilling] = useState<Billing | null>(null);
  const [forWho, setForWho] = useState<"child" | "self">("child");
  const [f, setF] = useState({ student: "", birth: "", guardian: "", phone: "", email: "", emergency: "", health: "", time: "", notes: "", website: "" });
  const [days, setDays] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [enrollId, setEnrollId] = useState<string | null>(null);
  const [live, setLive] = useState<EnrollmentLive>("pending");
  const [pending, start] = useTransition();
  const top = useRef<HTMLDivElement>(null);

  const offered = useMemo(() => (pack ? BILLING_ORDER.filter((b) => pack.prices[b] !== undefined) : []), [pack]);
  const effBilling = billing && offered.includes(billing) ? billing : (offered.includes("monthly") ? "monthly" : offered[0] ?? null);
  const price = pack && effBilling ? pack.prices[effBilling] : undefined;
  const need = pack?.daysPerWeek ?? 0;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pack || !effBilling) return setError("Elegí un pack.");
    if (days.length < need) return setError(`Elegí al menos ${need} ${need === 1 ? "día" : "días"} que te queden cómodos.`);
    start(async () => {
      const r = await enroll({
        packId: pack.id,
        billing: effBilling,
        studentName: f.student,
        birthDate: f.birth,
        guardianName: forWho === "self" ? f.student : f.guardian,
        phone: f.phone,
        email: f.email,
        emergency: f.emergency,
        health: f.health,
        days,
        time: f.time,
        notes: f.notes,
        website: f.website || undefined,
      });
      if (r.ok) {
        setEnrollId(r.id);
        setLive("pending");
        setDone(true);
        top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else setError(r.error);
    });
  }

  // Mientras la pantalla de "enviada" está abierta, se consulta el estado y se actualiza sola cuando el predio acepta o rechaza.
  useEffect(() => {
    if (!done || !enrollId || live === "active" || live === "cancelled") return;
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      const st = await checkEnrollmentStatus(enrollId).catch(() => "unknown" as const);
      if (!stop && (st === "active" || st === "cancelled" || st === "paused")) setLive(st);
    };
    const t = setInterval(tick, 6000);
    const onVis = () => { if (!document.hidden) void tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [done, enrollId, live]);

  if (done) {
    const ok = live === "active" || live === "paused";
    const no = live === "cancelled";
    return (
      <div ref={top} className="tr-hero glass glass-lime p-8 text-center step-enter sm:p-12">
        <div key={live} className="step-enter">
          <SuccessMark kind={ok ? "ok" : no ? "no" : "pending"} />
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">
            {ok ? "¡Inscripción aceptada!" : no ? "No pudimos aceptarla" : "¡Solicitud enviada!"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            {ok ? (
              <>La inscripción de <strong className="text-foreground">{f.student}</strong> quedó confirmada. Te vamos a escribir por WhatsApp al <strong className="text-foreground">{f.phone}</strong> para pasarte los días y horarios. El pago se hace en el predio.</>
            ) : no ? (
              <>Por ahora no pudimos aceptar la inscripción de <strong className="text-foreground">{f.student}</strong>. Escribinos por WhatsApp al predio y lo vemos juntos.</>
            ) : (
              <>Recibimos la inscripción de <strong className="text-foreground">{f.student}</strong>. Te vamos a contactar por WhatsApp al <strong className="text-foreground">{f.phone}</strong> para confirmar los días y horarios. El pago se hace en el predio.</>
            )}
          </p>
          {!ok && !no && (
            <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full glass-soft px-4 py-1.5 text-sm text-muted">
              <span className="live-dot" aria-hidden /> Esperando confirmación del predio. Esta pantalla se actualiza sola.
            </p>
          )}
        </div>
        <button type="button" onClick={() => { setDone(false); setPackId(null); setDays([]); setF({ student: "", birth: "", guardian: "", phone: "", email: "", emergency: "", health: "", time: "", notes: "", website: "" }); }} className="mt-6 h-11 rounded-xl border border-border px-5 font-medium transition hover:border-lime">
          Inscribir a otra persona
        </button>
      </div>
    );
  }

  if (!act) {
    return <p className="glass rounded-2xl px-5 py-10 text-center text-muted">Todavía no hay entrenamientos disponibles. Volvé a mirar pronto.</p>;
  }

  return (
    <form ref={top as unknown as React.RefObject<HTMLFormElement>} onSubmit={submit} className="flex flex-col gap-10" noValidate>
      <ol className="tr-steps -mb-4" aria-label="Pasos">
        {["Actividad", "Pack", "Tus datos", "Días"].map((t, i) => (
          <li key={t} data-on={i === 0 || (i === 1 && !!act) || (i >= 2 && !!pack)}>{t}</li>
        ))}
      </ol>
      <section aria-labelledby="t-act" className="scroll-mt-24">
        <h2 id="t-act" className="mb-3 font-[family-name:var(--font-display)] text-2xl font-bold uppercase">1 · ¿Qué querés entrenar?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {catalog.map((a, i) => (
            <button
              key={a.id}
              type="button"
              style={{ "--i": i } as React.CSSProperties}
              onClick={() => { setActId(a.id); setPackId(null); }}
              aria-pressed={a.id === act.id}
              className="glass tr-card tr-in flex items-start gap-4 p-5 text-left"
            >
              <span className="glass-ico shrink-0"><Dumbbell size={22} aria-hidden /></span>
              <span className="min-w-0">
                <span className="block font-[family-name:var(--font-display)] text-2xl font-bold uppercase leading-tight">{a.name}</span>
                {a.location && <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-lime-ink"><MapPin size={12} aria-hidden />{a.location}</span>}
                {a.description && <span className="mt-2 block text-sm text-muted">{a.description}</span>}
              </span>
              <span className="tr-check" aria-hidden><Check size={15} strokeWidth={3} /></span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="t-pack" className="scroll-mt-24">
        <h2 id="t-pack" className="mb-3 font-[family-name:var(--font-display)] text-2xl font-bold uppercase">2 · Elegí tu pack</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {act.packs.map((p, i) => {
            const sel = p.id === packId;
            const first = BILLING_ORDER.find((b) => p.prices[b] !== undefined)!;
            const shown = p.prices.monthly !== undefined ? "monthly" : first;
            return (
              <button
                key={p.id}
                type="button"
                style={{ "--i": i } as React.CSSProperties}
                onClick={() => { setPackId(p.id); setBilling(null); }}
                aria-pressed={sel}
                className="glass tr-card tr-in flex flex-col gap-3 p-5 text-left"
              >
                <span className="flex items-end gap-3">
                  <span className="tr-days">{p.daysPerWeek}</span>
                  <span className="pb-1 text-xs font-bold uppercase leading-tight tracking-wide text-muted">{p.daysPerWeek === 1 ? "día" : "días"}<br />por semana</span>
                </span>
                <span>
                  <span className="block font-[family-name:var(--font-display)] text-xl font-bold uppercase leading-tight">{p.name}</span>
                  {p.description && <span className="mt-1 block text-sm text-muted">{p.description}</span>}
                </span>
                <span className="mt-auto border-t border-border pt-3">
                  <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold">{formatMoney(p.prices[shown]!)}</span>{" "}
                  <span className="text-sm text-muted">{BILLING_SUFFIX[shown]}</span>
                </span>
                <span className="tr-check" aria-hidden><Check size={15} strokeWidth={3} /></span>
              </button>
            );
          })}
        </div>

        {pack && offered.length > 0 && (
          <fieldset className="mt-4 step-enter">
            <legend className="mb-2 text-sm font-medium">¿Cómo preferís pagar?</legend>
            <div className="flex flex-wrap gap-2">
              {offered.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBilling(b)}
                  aria-pressed={b === effBilling}
                  className={cn("rounded-xl border px-4 py-2.5 text-sm font-medium transition", b === effBilling ? "slot-sel border-lime bg-lime text-black" : "glass hover:border-lime/60")}
                >
                  {BILLING_LABEL[b]} · <strong>{formatMoney(pack.prices[b]!)}</strong>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">El pago se hace en el predio.</p>
          </fieldset>
        )}
      </section>

      {pack && (
        <section aria-labelledby="t-data" className="flex flex-col gap-4 glass rounded-[2rem] p-5 step-enter scroll-mt-24 sm:p-8">
          <h2 id="t-data" className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase">3 · Datos</h2>
          <div className="flex gap-2" role="group" aria-label="¿Quién entrena?">
            {([["child", "Mi hijo/a"], ["self", "Yo"]] as const).map(([k, t]) => (
              <button key={k} type="button" aria-pressed={forWho === k} onClick={() => setForWho(k)} className={cn("h-11 rounded-xl border px-5 text-sm font-medium transition", forWho === k ? "border-lime bg-lime/15 text-lime-ink" : "glass hover:border-lime/60")}>
                {t}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>{forWho === "self" ? "Tu nombre y apellido" : "Nombre y apellido del alumno"}<input className={input} value={f.student} onChange={set("student")} maxLength={100} required autoComplete="off" /></label>
            <label className={label}>Fecha de nacimiento<input className={input} type="date" value={f.birth} onChange={set("birth")} required max={new Date().toISOString().slice(0, 10)} /></label>
            {forWho === "child" && <label className={label}>Nombre del responsable<input className={input} value={f.guardian} onChange={set("guardian")} maxLength={100} required autoComplete="name" /></label>}
            <label className={label}>WhatsApp de contacto<input className={input} type="tel" inputMode="tel" placeholder="Con código de área" value={f.phone} onChange={set("phone")} required autoComplete="tel" /></label>
            <label className={label}>Email <span className="font-normal text-muted">(opcional)</span><input className={input} type="email" value={f.email} onChange={set("email")} maxLength={150} autoComplete="email" /></label>
            <label className={label}>Contacto de emergencia <span className="font-normal text-muted">(nombre y teléfono)</span><input className={input} value={f.emergency} onChange={set("emergency")} maxLength={200} /></label>
          </div>
          <label className={label}>Salud o lesiones a tener en cuenta <span className="font-normal text-muted">(opcional)</span>
            <textarea className={cn(input, "h-24 resize-none py-3")} value={f.health} onChange={set("health")} maxLength={500} placeholder="Alergias, asma, lesiones previas, etc." />
          </label>
        </section>
      )}

      {pack && (
        <section aria-labelledby="t-days" className="flex flex-col gap-4 glass rounded-[2rem] p-5 step-enter scroll-mt-24 sm:p-8">
          <h2 id="t-days" className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase">4 · ¿Qué días te quedan cómodos?</h2>
          <p className="-mt-2 text-sm text-muted">Elegí al menos {need} {need === 1 ? "día" : "días"}. Los horarios los confirmamos con vos.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Días preferidos">
            {WEEKDAYS.map((d, i) => {
              const on = days.includes(i);
              return (
                <button key={d} type="button" aria-pressed={on} onClick={() => setDays((s) => (on ? s.filter((x) => x !== i) : [...s, i].sort()))} className={cn("tr-day h-12 min-w-[4.25rem] flex-1 rounded-xl border px-3 text-sm font-semibold sm:min-w-24 sm:flex-none", on ? "border-lime bg-lime text-black" : "glass hover:border-lime/60")}>
                  <span className="sm:hidden">{d.slice(0, 3)}</span><span className="hidden sm:inline">{d}</span>
                </button>
              );
            })}
          </div>
          <label className={label}>Franja horaria que preferís <span className="font-normal text-muted">(opcional)</span><input className={input} value={f.time} onChange={set("time")} maxLength={200} placeholder="Ej. a la tarde, después de las 18" /></label>
          <label className={label}>Comentarios <span className="font-normal text-muted">(opcional)</span><textarea className={cn(input, "h-24 resize-none py-3")} value={f.notes} onChange={set("notes")} maxLength={500} /></label>

          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>No completar<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></label>
          </div>

          {error && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

          <div className="tr-bar glass glass-lime flex flex-wrap items-center gap-4 rounded-2xl p-4">
            <p className="min-w-0 flex-1 text-sm">
              <strong>{act.name} · {pack.name}</strong>
              <span className="block text-muted">{price !== undefined && effBilling ? `${formatMoney(price)} ${BILLING_SUFFIX[effBilling]}` : ""}</span>
            </p>
            <button type="submit" disabled={pending} className="h-12 rounded-xl bg-lime px-7 font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-black transition hover:bg-lime-dark disabled:opacity-60">
              <span className="inline-flex items-center gap-2"><Send size={18} aria-hidden />{pending ? "Enviando…" : "Enviar inscripción"}</span>
            </button>
          </div>
        </section>
      )}
    </form>
  );
}
