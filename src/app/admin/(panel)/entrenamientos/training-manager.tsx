"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BILLING_LABEL, BILLING_ORDER, type Billing } from "@/lib/training";
import { saveCoach, addActivity, addPack, deleteActivity, deletePack, updateActivity, updatePack } from "./training-actions";

export type PackRow = { id: string; name: string; description: string; daysPerWeek: number; isActive: boolean; prices: Partial<Record<Billing, number>> };
export type ActivityRow = { id: string; name: string; description: string; location: string; isActive: boolean; packs: PackRow[] };

const field = "h-10 min-w-0 rounded-xl border border-border bg-surface-2 px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";
type Res = { ok: boolean; message?: string; error?: string };

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  function run(fn: () => Promise<Res>, onOk?: () => void) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: (r.ok ? r.message : r.error) ?? "" });
      if (r.ok) { onOk?.(); router.refresh(); }
    });
  }
  return { pending, msg, run };
}

type PackForm = { name: string; description: string; days: string; active: boolean; prices: Record<Billing, string> };
const emptyPack = (): PackForm => ({ name: "", description: "", days: "2", active: true, prices: { per_class: "", monthly: "", quarterly: "" } });
const fromPack = (p: PackRow): PackForm => ({
  name: p.name, description: p.description, days: String(p.daysPerWeek), active: p.isActive,
  prices: { per_class: p.prices.per_class?.toString() ?? "", monthly: p.prices.monthly?.toString() ?? "", quarterly: p.prices.quarterly?.toString() ?? "" },
});
function toInput(f: PackForm) {
  const n = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
  return { name: f.name, description: f.description, daysPerWeek: Number(f.days), isActive: f.active, prices: { per_class: n(f.prices.per_class), monthly: n(f.prices.monthly), quarterly: n(f.prices.quarterly) } };
}

function PackFields({ f, setF }: { f: PackForm; setF: (v: PackForm) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <input className={field} placeholder="Nombre del pack (ej. Funcional 2 veces)" value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Nombre del pack" />
      <label className="flex items-center gap-2 text-sm">
        Días por semana
        <select className={`${field} w-20`} value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <label className="ml-auto flex items-center gap-2">
          <input type="checkbox" className="h-5 w-5 accent-[var(--lime)]" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Visible
        </label>
      </label>
      <input className={`${field} sm:col-span-2`} placeholder="Descripción (opcional)" value={f.description} maxLength={400} onChange={(e) => setF({ ...f, description: e.target.value })} aria-label="Descripción del pack" />
      {BILLING_ORDER.map((b) => (
        <label key={b} className="flex items-center gap-2 text-sm">
          <span className="w-20 shrink-0">{BILLING_LABEL[b]}</span>
          <input className={`${field} w-full`} inputMode="decimal" placeholder="Precio (vacío = no se ofrece)" value={f.prices[b]} onChange={(e) => setF({ ...f, prices: { ...f.prices, [b]: e.target.value } })} />
        </label>
      ))}
    </div>
  );
}

function PackItem({ pack }: { pack: PackRow }) {
  const { pending, msg, run } = useRun();
  const [f, setF] = useState(fromPack(pack));
  return (
    <li className="rounded-xl border border-border bg-surface-2/50 p-3">
      <PackFields f={f} setF={setF} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => updatePack(pack.id, toInput(f)))} className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold text-black disabled:opacity-60">Guardar pack</button>
        <button type="button" disabled={pending} onClick={() => { if (confirm(`¿Borrar el pack "${pack.name}"? Las inscripciones ya hechas no se pierden.`)) run(() => deletePack(pack.id)); }} className="h-10 rounded-xl border border-border px-4 text-sm text-danger transition hover:border-danger disabled:opacity-60">Borrar</button>
        {msg && <span role="status" className={`text-xs ${msg.ok ? "text-lime-ink" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </li>
  );
}

function NewPack({ activityId }: { activityId: string }) {
  const { pending, msg, run } = useRun();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(emptyPack());
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="h-10 self-start rounded-xl border border-border px-4 text-sm font-semibold transition hover:border-lime">+ Agregar pack</button>;
  return (
    <div className="rounded-xl border border-lime/40 p-3">
      <PackFields f={f} setF={setF} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending || f.name.trim() === ""} onClick={() => run(() => addPack(activityId, toInput(f)), () => { setF(emptyPack()); setOpen(false); })} className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold text-black disabled:opacity-60">Crear pack</button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-xl border border-border px-4 text-sm">Cancelar</button>
        {msg && <span role="status" className={`text-xs ${msg.ok ? "text-lime-ink" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}

function ActivityItem({ a }: { a: ActivityRow }) {
  const { pending, msg, run } = useRun();
  const [f, setF] = useState({ name: a.name, description: a.description, location: a.location, isActive: a.isActive });
  return (
    <li className="rounded-2xl border border-border p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={field} value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Nombre de la actividad" placeholder="Nombre (ej. Funcional)" />
        <input className={field} value={f.location} maxLength={60} onChange={(e) => setF({ ...f, location: e.target.value })} aria-label="Lugar" placeholder="Lugar (ej. Gimnasio)" />
        <input className={`${field} sm:col-span-2`} value={f.description} maxLength={400} onChange={(e) => setF({ ...f, description: e.target.value })} aria-label="Descripción" placeholder="Descripción (opcional)" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--lime)]" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Visible en la web</label>
        <button type="button" disabled={pending} onClick={() => run(() => updateActivity(a.id, f))} className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold text-black disabled:opacity-60">Guardar actividad</button>
        <button type="button" disabled={pending} onClick={() => { if (confirm(`¿Borrar "${a.name}" y todos sus packs? Las inscripciones ya hechas no se pierden.`)) run(() => deleteActivity(a.id)); }} className="h-10 rounded-xl border border-border px-4 text-sm text-danger transition hover:border-danger disabled:opacity-60">Borrar actividad</button>
        {msg && <span role="status" className={`text-xs ${msg.ok ? "text-lime-ink" : "text-danger"}`}>{msg.text}</span>}
      </div>
      <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-muted">Packs</h3>
      <ul className="mb-3 flex flex-col gap-3">{a.packs.map((p) => <PackItem key={p.id} pack={p} />)}</ul>
      <NewPack activityId={a.id} />
    </li>
  );
}

export type CoachRow = { name: string; title: string; bio: string; story: string; show: boolean };

export function CoachEditor({ coach }: { coach: CoachRow }) {
  const { pending, msg, run } = useRun();
  const [c, setC] = useState(coach);
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">Profe y su historia (se muestra en la web, sección «Entrenamientos»)</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={field} placeholder="Nombre" value={c.name} maxLength={80} onChange={(e) => setC({ ...c, name: e.target.value })} aria-label="Nombre del profe" />
        <input className={field} placeholder="Título (ej. Profe y dueño)" value={c.title} maxLength={120} onChange={(e) => setC({ ...c, title: e.target.value })} aria-label="Título del profe" />
        <textarea className={`${field} h-20 py-2 sm:col-span-2`} placeholder="Presentación breve (opcional)" value={c.bio} maxLength={500} onChange={(e) => setC({ ...c, bio: e.target.value })} aria-label="Presentación del profe" />
        <textarea className={`${field} h-48 py-2 sm:col-span-2`} placeholder="Cómo surgió la idea de los entrenamientos (historia en tus palabras; los saltos de línea arman párrafos)" value={c.story} maxLength={3000} onChange={(e) => setC({ ...c, story: e.target.value })} aria-label="Cómo surgió la idea" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--lime)]" checked={c.show} onChange={(e) => setC({ ...c, show: e.target.checked })} /> Mostrar</label>
        <button type="button" disabled={pending} onClick={() => run(() => saveCoach({ name: c.name, title: c.title, bio: c.bio, story: c.story, show: c.show }))} className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold text-black disabled:opacity-50">Guardar</button>
        {msg && <span className={msg.ok ? "text-sm text-lime-ink" : "text-sm text-danger"} role="status">{msg.text}</span>}
      </div>
    </div>
  );
}

export function TrainingManager({ activities }: { activities: ActivityRow[] }) {
  const { pending, msg, run } = useRun();
  const [f, setF] = useState({ name: "", description: "", location: "", isActive: true });
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase">Entrenamientos</h2>
      <p className="mb-4 text-sm text-muted">
        Actividades y packs que se ofrecen en la web (sección «Entrenamientos»). Cada pack tiene sus días por semana y hasta tres precios: por clase, mensual y trimestral;
        los que dejes vacíos no se ofrecen. Se aplica al instante.
      </p>
      <ul className="flex flex-col gap-4">{activities.map((a) => <ActivityItem key={a.id} a={a} />)}</ul>
      <form
        className="mt-4 flex flex-col gap-2 border-t border-border pt-4"
        onSubmit={(e) => { e.preventDefault(); run(() => addActivity(f), () => setF({ name: "", description: "", location: "", isActive: true })); }}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={field} value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nueva actividad (ej. Funcional infantil)" aria-label="Nombre de la nueva actividad" />
          <input className={field} value={f.location} maxLength={60} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Lugar (ej. Cancha)" aria-label="Lugar" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || f.name.trim() === ""} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold transition hover:border-lime disabled:opacity-50">Agregar actividad</button>
          {msg && <span role="status" className={`text-sm ${msg.ok ? "text-lime-ink" : "text-danger"}`}>{msg.text}</span>}
        </div>
      </form>
    </section>
  );
}
