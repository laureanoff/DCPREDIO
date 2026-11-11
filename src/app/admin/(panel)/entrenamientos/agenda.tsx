"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WEEKDAYS } from "@/lib/training";
import { deleteSession, saveSession } from "./training-actions";

export type SessionRow = { id: string; weekday: number; start: string; end: string; title: string; details: string; isActive: boolean };
export type DayStudent = { name: string; activity: string; status: string };

const field = "h-10 min-w-0 rounded-xl border border-border bg-surface-2 px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";
type Form = { weekday: number; start: string; end: string; title: string; details: string; isActive: boolean };
const empty = (weekday = 0): Form => ({ weekday, start: "18:00", end: "19:00", title: "", details: "", isActive: true });

function SessionForm({ initial, id, onDone }: { initial: Form; id: string | null; onDone: () => void }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const r = await saveSession(id, f);
      if (!r.ok) return setErr(r.error);
      if (!id) setF(empty(f.weekday));
      router.refresh();
      onDone();
    });
  }
  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[9rem_6.5rem_6.5rem_1fr]">
      <select className={field} value={f.weekday} onChange={(e) => setF({ ...f, weekday: Number(e.target.value) })} aria-label="Día">
        {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
      </select>
      <input className={field} type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} aria-label="Desde" required />
      <input className={field} type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} aria-label="Hasta" />
      <input className={field} value={f.title} maxLength={80} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Tipo de entrenamiento (ej. Funcional niños)" aria-label="Tipo de entrenamiento" required />
      <textarea className={`${field} h-20 py-2 sm:col-span-4`} value={f.details} maxLength={500} onChange={(e) => setF({ ...f, details: e.target.value })} placeholder="Qué se hace en la clase, material, nivel, cupo… (opcional)" aria-label="Detalle" />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--lime)]" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Visible en la web</label>
        <button type="submit" disabled={pending} className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold text-black disabled:opacity-60">{id ? "Guardar" : "Agregar horario"}</button>
        {err && <span role="alert" className="text-sm text-danger">{err}</span>}
      </div>
    </form>
  );
}

function SessionItem({ s }: { s: SessionRow }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [pending, start] = useTransition();
  if (edit) return <li className="rounded-xl border border-lime/40 bg-surface-2 p-3"><SessionForm id={s.id} initial={{ weekday: s.weekday, start: s.start, end: s.end, title: s.title, details: s.details, isActive: s.isActive }} onDone={() => setEdit(false)} /></li>;
  return (
    <li className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{s.start}{s.end && ` a ${s.end}`} · {s.title}{!s.isActive && <span className="ml-2 text-xs font-normal text-muted">(oculto)</span>}</p>
          {s.details && <p className="mt-1 whitespace-pre-line text-muted">{s.details}</p>}
        </div>
        <div className="flex shrink-0 gap-3 text-xs font-semibold">
          <button type="button" onClick={() => setEdit(true)} className="text-lime-ink hover:underline">Editar</button>
          <button type="button" disabled={pending} onClick={() => { if (confirm("¿Borrar este horario?")) start(async () => { await deleteSession(s.id); router.refresh(); }); }} className="text-danger hover:underline">Borrar</button>
        </div>
      </div>
    </li>
  );
}

export function Agenda({ sessions, students }: { sessions: SessionRow[]; students: Record<number, DayStudent[]> }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase">Agregar horario</h2>
        <p className="mb-3 text-sm text-muted">Anotá qué se entrena, qué día y a qué hora. Lo que dejes visible aparece en la web, en «Entrenamientos».</p>
        <SessionForm id={null} initial={empty()} onDone={() => {}} />
      </section>
      <div className="grid gap-3 lg:grid-cols-2">
        {WEEKDAYS.map((d, i) => {
          const list = sessions.filter((s) => s.weekday === i);
          const st = students[i] ?? [];
          return (
            <section key={d} className="rounded-2xl border border-border bg-surface p-4">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase">{d}</h3>
              {list.length === 0 ? <p className="mt-1 text-sm text-muted">Sin entrenamientos cargados.</p> : <ul className="mt-2 flex flex-col gap-2">{list.map((s) => <SessionItem key={s.id} s={s} />)}</ul>}
              <div className="mt-3 border-t border-border pt-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Alumnos que eligieron este día ({st.length})</p>
                {st.length === 0 ? <p className="text-muted">Nadie todavía.</p> : <p>{st.map((x) => `${x.name} (${x.activity})`).join(" · ")}</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
