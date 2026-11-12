"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BENEFIT_ICONS, BILLING_LABEL, BILLING_ORDER, type Billing } from "@/lib/training";
import { createClient } from "@/lib/supabase/browser";
import { CoachPhoto, type CoachPhotoData } from "@/components/public/CoachPhoto";
import { removeCoachPhoto, saveCoachPhoto, saveCoach, savePageContent, addActivity, addPack, deleteActivity, deletePack, updateActivity, updatePack } from "./training-actions";

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
      <input className={field} placeholder="Nombre de la opción (ej. 2 veces por semana)" value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Nombre de la opción" />
      <label className="flex items-center gap-2 text-sm">
        Días por semana
        <select className={`${field} w-20`} value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <label className="ml-auto flex items-center gap-2">
          <input type="checkbox" className="h-5 w-5 accent-[var(--lime)]" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Visible
        </label>
      </label>
      <input className={`${field} sm:col-span-2`} placeholder="Descripción (opcional)" value={f.description} maxLength={400} onChange={(e) => setF({ ...f, description: e.target.value })} aria-label="Descripción de la opción" />
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
        <button type="button" disabled={pending} onClick={() => run(() => updatePack(pack.id, toInput(f)))} className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold text-black disabled:opacity-60">Guardar opción</button>
        <button type="button" disabled={pending} onClick={() => { if (confirm(`¿Borrar la opción "${pack.name}"? Las inscripciones ya hechas no se pierden.`)) run(() => deletePack(pack.id)); }} className="h-10 rounded-xl border border-border px-4 text-sm text-danger transition hover:border-danger disabled:opacity-60">Borrar</button>
        {msg && <span role="status" className={`text-xs ${msg.ok ? "text-lime-ink" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </li>
  );
}

function NewPack({ activityId }: { activityId: string }) {
  const { pending, msg, run } = useRun();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(emptyPack());
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="h-10 self-start rounded-xl border border-border px-4 text-sm font-semibold transition hover:border-lime">+ Agregar opción</button>;
  return (
    <div className="rounded-xl border border-lime/40 p-3">
      <PackFields f={f} setF={setF} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending || f.name.trim() === ""} onClick={() => run(() => addPack(activityId, toInput(f)), () => { setF(emptyPack()); setOpen(false); })} className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold text-black disabled:opacity-60">Crear opción</button>
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
        <button type="button" disabled={pending} onClick={() => { if (confirm(`¿Borrar "${a.name}" y todas sus opciones? Las inscripciones ya hechas no se pierden.`)) run(() => deleteActivity(a.id)); }} className="h-10 rounded-xl border border-border px-4 text-sm text-danger transition hover:border-danger disabled:opacity-60">Borrar actividad</button>
        {msg && <span role="status" className={`text-xs ${msg.ok ? "text-lime-ink" : "text-danger"}`}>{msg.text}</span>}
      </div>
      <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-muted">Opciones (días por semana)</h3>
      <ul className="mb-3 flex flex-col gap-3">{a.packs.map((p) => <PackItem key={p.id} pack={p} />)}</ul>
      <NewPack activityId={a.id} />
    </li>
  );
}

export type ProposalRow = { title: string; subtitle: string; text: string; tags: string };
export type BenefitRow = { icon: string; title: string; text: string };
export type ContentRow = { benefitsTitle: string; benefits: BenefitRow[]; tagline: string; text: string; proposalsTitle: string; proposals: ProposalRow[]; showPrices: boolean; showSchedule: boolean };

/** Textos de la página pública: lema, presentación, propuestas por edad y qué se muestra (precios, horarios). */
export function ContentEditor({ content }: { content: ContentRow }) {
  const { pending, msg, run } = useRun();
  const [c, setC] = useState(content);
  const setP = (i: number, patch: Partial<ProposalRow>) => setC((s) => ({ ...s, proposals: s.proposals.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const move = (i: number, d: -1 | 1) => setC((s) => {
    const j = i + d;
    if (j < 0 || j >= s.proposals.length) return s;
    const a = [...s.proposals];
    [a[i], a[j]] = [a[j], a[i]];
    return { ...s, proposals: a };
  });
  const setB = (i: number, patch: Partial<BenefitRow>) => setC((s) => ({ ...s, benefits: s.benefits.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const moveB = (i: number, d: -1 | 1) => setC((s) => {
    const j = i + d;
    if (j < 0 || j >= s.benefits.length) return s;
    const a = [...s.benefits];
    [a[i], a[j]] = [a[j], a[i]];
    return { ...s, benefits: a };
  });
  const toInput = () => ({
    benefitsTitle: c.benefitsTitle, benefits: c.benefits,
    tagline: c.tagline, text: c.text, proposalsTitle: c.proposalsTitle, showPrices: c.showPrices, showSchedule: c.showSchedule,
    proposals: c.proposals.map((p) => ({ title: p.title, subtitle: p.subtitle, text: p.text, tags: p.tags.split(",").map((t) => t.trim()).filter(Boolean) })),
  });
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-1 text-sm font-bold uppercase tracking-wide">Textos de la página de Entrenamientos</h3>
      <p className="mb-3 text-sm text-muted">Lo que se lee arriba de todo y las propuestas por edad. Se actualiza en la web al guardar.</p>
      <div className="grid gap-2">
        <input className={field} placeholder="Lema (ej. Entrená. Desarrollá tus capacidades. Evolucioná.)" value={c.tagline} maxLength={140} onChange={(e) => setC({ ...c, tagline: e.target.value })} aria-label="Lema" />
        <textarea className={`${field} h-28 py-2`} placeholder="Presentación" value={c.text} maxLength={700} onChange={(e) => setC({ ...c, text: e.target.value })} aria-label="Presentación" />
        <input className={field} placeholder="Título de la sección de propuestas" value={c.proposalsTitle} maxLength={100} onChange={(e) => setC({ ...c, proposalsTitle: e.target.value })} aria-label="Título de las propuestas" />
      </div>

      <h4 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-muted">Propuestas ({c.proposals.length}/8)</h4>
      <ul className="flex flex-col gap-3">
        {c.proposals.map((p, i) => (
          <li key={i} className="rounded-xl border border-border bg-surface-2/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <span className="text-lime-ink">{String(i + 1).padStart(2, "0")}</span>
              <span className="ml-auto flex gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className="h-9 w-9 rounded-lg border border-border disabled:opacity-40">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === c.proposals.length - 1} aria-label="Bajar" className="h-9 w-9 rounded-lg border border-border disabled:opacity-40">↓</button>
                <button type="button" onClick={() => { if (confirm(`¿Quitar la propuesta "${p.title || i + 1}"?`)) setC((s) => ({ ...s, proposals: s.proposals.filter((_, j) => j !== i) })); }} className="h-9 rounded-lg border border-border px-3 text-danger transition hover:border-danger">Quitar</button>
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={field} placeholder="Título (ej. Infantiles)" value={p.title} maxLength={60} onChange={(e) => setP(i, { title: e.target.value })} aria-label="Título" />
              <input className={field} placeholder="Subtítulo (ej. Nivel Inicial y Primario)" value={p.subtitle} maxLength={80} onChange={(e) => setP(i, { subtitle: e.target.value })} aria-label="Subtítulo" />
              <textarea className={`${field} h-24 py-2 sm:col-span-2`} placeholder="Descripción" value={p.text} maxLength={400} onChange={(e) => setP(i, { text: e.target.value })} aria-label="Descripción" />
              <input className={`${field} sm:col-span-2`} placeholder="Etiquetas separadas por coma (ej. Fuerza, Movilidad, Resistencia)" value={p.tags} onChange={(e) => setP(i, { tags: e.target.value })} aria-label="Etiquetas" />
            </div>
          </li>
        ))}
      </ul>
      {c.proposals.length < 8 && (
        <button type="button" onClick={() => setC((s) => ({ ...s, proposals: [...s.proposals, { title: "", subtitle: "", text: "", tags: "" }] }))} className="mt-3 h-10 rounded-xl border border-border px-4 text-sm font-semibold transition hover:border-lime">+ Agregar propuesta</button>
      )}

      <h4 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-muted">«Lo que vas a lograr» ({c.benefits.length}/12)</h4>
      <input className={`${field} mb-3 w-full`} placeholder="Título (ej. Entrená mejor, sentite mejor)" value={c.benefitsTitle} maxLength={100} onChange={(e) => setC({ ...c, benefitsTitle: e.target.value })} aria-label="Título de lo que vas a lograr" />
      <ul className="flex flex-col gap-3">
        {c.benefits.map((b, i) => (
          <li key={i} className="rounded-xl border border-border bg-surface-2/50 p-3">
            <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
              <select className={field} value={b.icon} onChange={(e) => setB(i, { icon: e.target.value })} aria-label="Ícono">
                {Object.entries(BENEFIT_ICONS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <input className={field} placeholder="Título (ej. Resistencia)" value={b.title} maxLength={60} onChange={(e) => setB(i, { title: e.target.value })} aria-label="Título del beneficio" />
              <textarea className={`${field} h-20 py-2 sm:col-span-2`} placeholder="Descripción" value={b.text} maxLength={300} onChange={(e) => setB(i, { text: e.target.value })} aria-label="Descripción del beneficio" />
            </div>
            <div className="mt-2 flex gap-1">
              <button type="button" onClick={() => moveB(i, -1)} disabled={i === 0} aria-label="Subir" className="h-9 w-9 rounded-lg border border-border disabled:opacity-40">↑</button>
              <button type="button" onClick={() => moveB(i, 1)} disabled={i === c.benefits.length - 1} aria-label="Bajar" className="h-9 w-9 rounded-lg border border-border disabled:opacity-40">↓</button>
              <button type="button" onClick={() => { if (confirm(`¿Quitar "${b.title || i + 1}"?`)) setC((s) => ({ ...s, benefits: s.benefits.filter((_, j) => j !== i) })); }} className="ml-auto h-9 rounded-lg border border-border px-3 text-sm text-danger transition hover:border-danger">Quitar</button>
            </div>
          </li>
        ))}
      </ul>
      {c.benefits.length < 12 && (
        <button type="button" onClick={() => setC((s) => ({ ...s, benefits: [...s.benefits, { icon: "medal", title: "", text: "" }] }))} className="mt-3 h-10 rounded-xl border border-border px-4 text-sm font-semibold transition hover:border-lime">+ Agregar beneficio</button>
      )}
      <p className="mt-2 text-xs text-muted">Si quitás todos, la sección no se muestra en la web.</p>

      <h4 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-muted">Qué se muestra en la web</h4>
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--lime)]" checked={c.showPrices} onChange={(e) => setC({ ...c, showPrices: e.target.checked })} /> <span><strong>Mostrar precios</strong> en las opciones y en la inscripción. Apagado: no se ve ningún precio y se los pasás a cada persona al confirmar.</span></label>
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--lime)]" checked={c.showSchedule} onChange={(e) => setC({ ...c, showSchedule: e.target.checked })} /> <span><strong>Mostrar días y horarios</strong> (sección «Cuándo entrenamos», con lo cargado en «Días y horarios»). Apagado: solo los ves vos acá.</span></label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} onClick={() => run(() => savePageContent(toInput()))} className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold text-black disabled:opacity-50">Guardar textos</button>
        {msg && <span role="status" className={`text-sm ${msg.ok ? "text-lime-ink" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}

export type CoachRow = { name: string; title: string; bio: string; story: string; show: boolean; photo: CoachPhotoData };

const PHOTO_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function PhotoEditor({ initial }: { initial: CoachPhotoData }) {
  const { pending, msg, run } = useRun();
  const [saved, setSaved] = useState(initial);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(initial?.zoom ?? 1);
  const [x, setX] = useState(initial?.x ?? 50);
  const [y, setY] = useState(initial?.y ?? 50);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shown: CoachPhotoData = preview ? { url: preview, zoom, x, y } : saved ? { ...saved, zoom, x, y } : null;

  function pick(f: File | null) {
    setErr(null);
    if (!f) return;
    if (!PHOTO_EXT[f.type]) return setErr("Usá una foto JPG, PNG o WebP.");
    if (f.size > 8 * 1048576) return setErr("La foto pesa más de 8 MB. Usá una más liviana.");
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      let path: string | null = null;
      if (file) {
        path = `coach-${crypto.randomUUID()}.${PHOTO_EXT[file.type]}`;
        const { error } = await createClient().storage.from("gallery").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
        if (error) throw new Error("No se pudo subir la foto. Revisá tu conexión e intentá de nuevo.");
      }
      run(() => saveCoachPhoto({ path, zoom, x, y }), () => { setFile(null); });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setBusy(false);
    }
  }

  const range = "w-full accent-[var(--lime)]";
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-1 text-sm font-bold uppercase tracking-wide">Foto del profe</h3>
      <p className="mb-3 text-sm text-muted">Subí una foto y ubicala con los controles: así se ve en la web (vista previa a la izquierda). Sin foto subida se usa la imagen por defecto.</p>
      <div className="grid gap-4 sm:grid-cols-[13rem_1fr]">
        <CoachPhoto photo={shown} alt="Vista previa" className="mx-auto h-72 w-52 sm:w-full" />
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="font-medium">Elegir foto</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pick(e.target.files?.[0] ?? null)} className="text-sm file:mr-3 file:h-10 file:rounded-xl file:border-0 file:bg-lime file:px-4 file:font-semibold file:text-black" />
          </label>
          <label className="flex flex-col gap-1">Zoom ({zoom.toFixed(1)}×)<input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className={range} disabled={!shown} /></label>
          <label className="flex flex-col gap-1">Horizontal ({x}%)<input type="range" min={0} max={100} value={x} onChange={(e) => setX(Number(e.target.value))} className={range} disabled={!shown} /></label>
          <label className="flex flex-col gap-1">Vertical ({y}%)<input type="range" min={0} max={100} value={y} onChange={(e) => setY(Number(e.target.value))} className={range} disabled={!shown} /></label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy || pending || (!file && !saved)} onClick={save} className="h-10 rounded-xl bg-lime px-4 font-semibold text-black disabled:opacity-50">{busy ? "Subiendo…" : "Guardar foto"}</button>
            {saved && <button type="button" disabled={pending} onClick={() => { if (confirm("¿Volver a la foto por defecto?")) run(() => removeCoachPhoto(), () => { setSaved(null); setFile(null); setPreview(null); setZoom(1); setX(50); setY(50); }); }} className="h-10 rounded-xl border border-border px-4 font-semibold">Quitar foto</button>}
          </div>
          {(err || msg) && <p role="status" className={err || !msg?.ok ? "text-danger" : "text-lime-ink"}>{err ?? msg?.text}</p>}
        </div>
      </div>
    </div>
  );
}

export function CoachEditor({ coach, content }: { coach: CoachRow; content: ContentRow }) {
  const { pending, msg, run } = useRun();
  const [c, setC] = useState(coach);
  return (
    <div className="flex flex-col gap-4">
    <ContentEditor content={content} />
    <PhotoEditor initial={coach.photo} />
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
        Actividades y opciones (días por semana) que se ofrecen en la web (sección «Entrenamientos»). Cada opción tiene sus días por semana y hasta tres precios: por clase, mensual y trimestral;
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
