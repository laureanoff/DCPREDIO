"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { deleteTestimonial, saveTestimonial } from "./training-actions";

export type Placement = "courts" | "trainings";
export type TestimonialRow = { id: string; author: string; detail: string; body: string; rating: number; isActive: boolean; placement: Placement };

const field = "h-10 min-w-0 rounded-xl border border-border bg-surface-2 px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";
type Form = { author: string; detail: string; body: string; rating: number; isActive: boolean; placement: Placement };
const empty = (placement: Placement): Form => ({ author: "", detail: "", body: "", rating: 5, isActive: true, placement });

function Row({ id, initial, onDone, onDelete }: { id: string | null; initial: Form; onDone?: () => void; onDelete?: () => void }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveTestimonial(id, f);
      setMsg({ ok: r.ok, text: (r.ok ? r.message : r.error) ?? "" });
      if (r.ok) { if (!id) setF(empty(f.placement)); router.refresh(); onDone?.(); }
    });
  }
  return (
    <div className="rounded-xl border border-border bg-surface-2/50 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={field} placeholder="Nombre (ej. Marcela, mamá de Joaquín)" value={f.author} maxLength={80} onChange={(e) => setF({ ...f, author: e.target.value })} aria-label="Nombre" />
        <input className={field} placeholder="Detalle (opcional, ej. Alumno de Infantiles)" value={f.detail} maxLength={80} onChange={(e) => setF({ ...f, detail: e.target.value })} aria-label="Detalle" />
        <textarea className={`${field} h-24 py-2 sm:col-span-2`} placeholder="Lo que dijo" value={f.body} maxLength={500} onChange={(e) => setF({ ...f, body: e.target.value })} aria-label="Testimonio" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="flex gap-0.5" role="radiogroup" aria-label="Estrellas">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={f.rating === n} aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`} onClick={() => setF({ ...f, rating: n })} className="p-1">
              <Star size={22} className={n <= f.rating ? "fill-lime text-lime" : "text-border"} />
            </button>
          ))}
        </span>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--lime)]" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Visible en la web</label>
        <button type="button" disabled={pending} onClick={save} className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold text-black disabled:opacity-60">{id ? "Guardar" : "Agregar testimonio"}</button>
        {onDelete && <button type="button" disabled={pending} onClick={onDelete} className="h-10 rounded-xl border border-border px-4 text-sm text-danger transition hover:border-danger disabled:opacity-60">Borrar</button>}
        {msg && <span role="status" className={`text-xs ${msg.ok ? "text-lime-ink" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}

function Item({ t }: { t: TestimonialRow }) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <li>
      <Row id={t.id} initial={{ author: t.author, detail: t.detail, body: t.body, rating: t.rating, isActive: t.isActive, placement: t.placement }}
        onDelete={() => { if (confirm(`¿Borrar el testimonio de "${t.author}"?`)) start(async () => { await deleteTestimonial(t.id); router.refresh(); }); }} />
    </li>
  );
}

function Group({ placement, title, hint, items }: { placement: Placement; title: string; hint: string; items: TestimonialRow[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase">{title}</h2>
      <p className="mb-4 text-sm text-muted">{hint} Mientras no haya ninguno visible, la sección no aparece. Cargá solo opiniones reales.</p>
      <ul className="mb-4 flex flex-col gap-3">{items.map((t) => <Item key={t.id} t={t} />)}</ul>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Agregar uno nuevo</h3>
      <Row id={null} initial={empty(placement)} />
    </section>
  );
}

export function TestimonialsManager({ items }: { items: TestimonialRow[] }) {
  return (
    <div className="flex flex-col gap-5">
      <Group placement="courts" title="Testimonios de la cancha" hint="De quienes juegan reservando la cancha. Se ven en la página de inicio." items={items.filter((t) => t.placement === "courts")} />
      <Group placement="trainings" title="Testimonios de entrenamientos" hint="De alumnos y familias. Se ven en la página de Entrenamientos." items={items.filter((t) => t.placement === "trainings")} />
    </div>
  );
}
