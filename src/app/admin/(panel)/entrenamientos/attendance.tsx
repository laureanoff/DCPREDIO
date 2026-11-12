"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WEEKDAYS } from "@/lib/training";
import { setAttendance } from "./actions";

export type AttStudent = { id: string; name: string; activity: string; preferredDays: number[]; presentMonth: number; absentMonth: number };
type St = "present" | "absent" | "justified";
const OPTS: { k: St; label: string; Icon: typeof Check; on: string }[] = [
  { k: "present", label: "Presente", Icon: Check, on: "border-lime bg-lime text-black" },
  { k: "absent", label: "Ausente", Icon: X, on: "border-danger bg-danger text-white" },
  { k: "justified", label: "Avisó", Icon: ShieldCheck, on: "border-warning bg-warning text-black" },
];

function shift(date: string, d: number) {
  const x = new Date(`${date}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + d);
  return x.toISOString().slice(0, 10);
}
/** 0 = lunes … 6 = domingo (como los días de la web). */
const weekdayOf = (date: string) => (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;

/** Lista de asistencia de un día: un toque por alumno (presente, ausente o avisó). Se guarda al instante. */
export function Attendance({ date, today, students, marks }: { date: string; today: string; students: AttStudent[]; marks: Record<string, St> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [local, setLocal] = useState(marks);
  const [err, setErr] = useState<string | null>(null);
  const wd = weekdayOf(date);
  const go = (d: string) => router.push(`/admin/entrenamientos?vista=asistencia&fecha=${d}`);
  const todays = students.filter((s) => s.preferredDays.includes(wd));
  const others = students.filter((s) => !s.preferredDays.includes(wd));
  const present = Object.values(local).filter((v) => v === "present").length;

  function mark(id: string, k: St) {
    const next = local[id] === k ? null : k;
    const prev = local;
    setErr(null);
    setLocal((m) => { const c = { ...m }; if (next) c[id] = next; else delete c[id]; return c; });
    start(async () => {
      const r = await setAttendance({ enrollmentId: id, date, status: next });
      if (!r.ok) { setLocal(prev); setErr(r.error); } else router.refresh();
    });
  }

  const Row = ({ s }: { s: AttStudent }) => (
    <li className="rounded-2xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-40 flex-1">
          <p className="font-semibold">{s.name}</p>
          <p className="text-xs text-muted">{s.activity} · este mes {s.presentMonth} {s.presentMonth === 1 ? "clase" : "clases"}{s.absentMonth > 0 && ` · ${s.absentMonth} ${s.absentMonth === 1 ? "falta" : "faltas"}`}</p>
        </div>
        <div className="flex gap-1.5" role="group" aria-label={`Asistencia de ${s.name}`}>
          {OPTS.map(({ k, label, Icon, on }) => (
            <button key={k} type="button" disabled={pending} aria-pressed={local[s.id] === k} onClick={() => mark(s.id, k)} className={cn("flex h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition disabled:opacity-60", local[s.id] === k ? on : "border-border text-muted hover:text-foreground")}>
              <Icon size={16} aria-hidden /> {label}
            </button>
          ))}
        </div>
      </div>
    </li>
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => go(shift(date, -1))} aria-label="Día anterior" className="flex h-11 w-11 items-center justify-center rounded-xl border border-border"><ChevronLeft size={18} /></button>
        <input type="date" value={date} max={today} onChange={(e) => e.target.value && go(e.target.value)} aria-label="Fecha de la clase" className="h-11 rounded-xl border border-border bg-surface-2 px-3 text-base outline-none focus:border-lime" />
        <button type="button" disabled={date >= today} onClick={() => go(shift(date, 1))} aria-label="Día siguiente" className="flex h-11 w-11 items-center justify-center rounded-xl border border-border disabled:opacity-40"><ChevronRight size={18} /></button>
        {date !== today && <button type="button" onClick={() => go(today)} className="h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:border-lime">Hoy</button>}
        <p className="ml-auto text-sm text-muted"><strong className="text-foreground">{WEEKDAYS[wd]}</strong> · {present} {present === 1 ? "presente" : "presentes"}</p>
      </div>
      {err && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{err}</p>}

      {students.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-5 py-10 text-center text-muted">Todavía no hay alumnos activos. Aceptá una inscripción para empezar.</p>
      ) : (
        <>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Les toca hoy ({todays.length})</h3>
            {todays.length ? <ul className="flex flex-col gap-2">{todays.map((s) => <Row key={s.id} s={s} />)}</ul> : <p className="text-sm text-muted">Nadie eligió {WEEKDAYS[wd].toLowerCase()} como día. Podés marcar a cualquiera abajo.</p>}
          </div>
          {others.length > 0 && (
            <details open={todays.length === 0}>
              <summary className="mb-2 cursor-pointer text-sm font-semibold uppercase tracking-wide text-muted">Otros alumnos ({others.length})</summary>
              <ul className="flex flex-col gap-2">{others.map((s) => <Row key={s.id} s={s} />)}</ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
