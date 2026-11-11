"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Check, Dumbbell, MapPin } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { BILLING_LABEL, BILLING_ORDER, BILLING_SUFFIX, WEEKDAYS, type Billing } from "@/lib/training";
import type { PublicActivity } from "@/queries/trainings";
import { enroll } from "./actions";

const input = "h-12 w-full rounded-xl border border-border bg-background px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";
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
        setDone(true);
        top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else setError(r.error);
    });
  }

  if (done) {
    return (
      <div ref={top} className="rounded-3xl border border-lime/50 bg-lime/10 p-8 text-center step-enter">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-lime text-black"><Check size={30} aria-hidden /></span>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">¡Solicitud enviada!</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Recibimos la inscripción de <strong className="text-foreground">{f.student}</strong>. Te vamos a contactar por WhatsApp al <strong className="text-foreground">{f.phone}</strong> para
          confirmar los días y horarios. El pago se hace en el predio.
        </p>
        <button type="button" onClick={() => { setDone(false); setPackId(null); setDays([]); setF({ student: "", birth: "", guardian: "", phone: "", email: "", emergency: "", health: "", time: "", notes: "", website: "" }); }} className="mt-6 h-11 rounded-xl border border-border px-5 font-medium transition hover:border-lime">
          Inscribir a otra persona
        </button>
      </div>
    );
  }

  if (!act) {
    return <p className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-muted">Todavía no hay entrenamientos disponibles. Volvé a mirar pronto.</p>;
  }

  return (
    <form ref={top as unknown as React.RefObject<HTMLFormElement>} onSubmit={submit} className="flex flex-col gap-10" noValidate>
      <section aria-labelledby="t-act" className="scroll-mt-24">
        <h2 id="t-act" className="mb-3 font-[family-name:var(--font-display)] text-2xl font-bold uppercase">1 · ¿Qué querés entrenar?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {catalog.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => { setActId(a.id); setPackId(null); }}
              aria-pressed={a.id === act.id}
              className={cn("rounded-2xl border p-4 text-left transition", a.id === act.id ? "border-lime bg-lime/10" : "border-border bg-surface hover:border-lime/60")}
            >
              <span className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl font-bold uppercase"><Dumbbell size={18} aria-hidden className="text-lime-ink" />{a.name}</span>
              {a.location && <span className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin size={12} aria-hidden />{a.location}</span>}
              {a.description && <span className="mt-2 block text-sm text-muted">{a.description}</span>}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="t-pack" className="scroll-mt-24">
        <h2 id="t-pack" className="mb-3 font-[family-name:var(--font-display)] text-2xl font-bold uppercase">2 · Elegí tu pack</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {act.packs.map((p) => {
            const sel = p.id === packId;
            const first = BILLING_ORDER.find((b) => p.prices[b] !== undefined)!;
            const shown = p.prices.monthly !== undefined ? "monthly" : first;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { setPackId(p.id); setBilling(null); }}
                aria-pressed={sel}
                className={cn("flex flex-col gap-1 rounded-2xl border p-4 text-left transition", sel ? "border-lime bg-lime/10" : "border-border bg-surface hover:border-lime/60")}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-lime-ink">{p.daysPerWeek} {p.daysPerWeek === 1 ? "día" : "días"} por semana</span>
                <span className="font-[family-name:var(--font-display)] text-xl font-bold uppercase">{p.name}</span>
                {p.description && <span className="text-sm text-muted">{p.description}</span>}
                <span className="mt-1 text-lg font-bold">
                  {formatMoney(p.prices[shown]!)} <span className="text-sm font-normal text-muted">{BILLING_SUFFIX[shown]}</span>
                </span>
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
                  className={cn("rounded-xl border px-4 py-2.5 text-sm font-medium transition", b === effBilling ? "border-lime bg-lime/15 text-lime-ink" : "border-border bg-surface hover:border-lime/60")}
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
        <section aria-labelledby="t-data" className="flex flex-col gap-4 step-enter scroll-mt-24">
          <h2 id="t-data" className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase">3 · Datos</h2>
          <div className="flex gap-2" role="group" aria-label="¿Quién entrena?">
            {([["child", "Mi hijo/a"], ["self", "Yo"]] as const).map(([k, t]) => (
              <button key={k} type="button" aria-pressed={forWho === k} onClick={() => setForWho(k)} className={cn("h-11 rounded-xl border px-5 text-sm font-medium transition", forWho === k ? "border-lime bg-lime/15 text-lime-ink" : "border-border bg-surface hover:border-lime/60")}>
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
        <section aria-labelledby="t-days" className="flex flex-col gap-4 step-enter scroll-mt-24">
          <h2 id="t-days" className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase">4 · ¿Qué días te quedan cómodos?</h2>
          <p className="-mt-2 text-sm text-muted">Elegí al menos {need} {need === 1 ? "día" : "días"}. Los horarios los confirmamos con vos.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Días preferidos">
            {WEEKDAYS.map((d, i) => {
              const on = days.includes(i);
              return (
                <button key={d} type="button" aria-pressed={on} onClick={() => setDays((s) => (on ? s.filter((x) => x !== i) : [...s, i].sort()))} className={cn("h-11 min-w-24 rounded-xl border px-4 text-sm font-medium transition", on ? "border-lime bg-lime text-black" : "border-border bg-surface hover:border-lime/60")}>
                  {d}
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

          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-4">
            <p className="min-w-0 flex-1 text-sm">
              <strong>{act.name} · {pack.name}</strong>
              <span className="block text-muted">{price !== undefined && effBilling ? `${formatMoney(price)} ${BILLING_SUFFIX[effBilling]}` : ""}</span>
            </p>
            <button type="submit" disabled={pending} className="h-12 rounded-xl bg-lime px-7 font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-black transition hover:bg-lime-dark disabled:opacity-60">
              {pending ? "Enviando…" : "Enviar inscripción"}
            </button>
          </div>
        </section>
      )}
    </form>
  );
}
