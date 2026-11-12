"use client";

import { useState, useTransition } from "react";
import { Send, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitReview } from "@/app/resenas/actions";
import { SuccessMark } from "./SuccessMark";

const input = "h-12 w-full rounded-xl glass-input px-3.5 text-base outline-none transition placeholder:text-muted/70 focus:border-lime focus:ring-2 focus:ring-lime/30";

/** Formulario para que cualquiera deje su opinión. Se publica cuando el predio la aprueba. */
export function ReviewForm({ placement, hasItems }: { placement: "courts" | "trainings"; hasItems: boolean }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [f, setF] = useState({ author: "", detail: "", body: "", website: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = hover || rating;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await submitReview({ placement, author: f.author, detail: f.detail, body: f.body, rating, website: f.website || undefined });
      if (r.ok) setDone(true);
      else setError(r.error);
    });
  }

  if (done) {
    return (
      <div className="glass glass-lime step-enter mt-4 rounded-3xl p-8 text-center">
        <SuccessMark kind="ok" />
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase">¡Gracias por tu opinión!</h3>
        <p className="mx-auto mt-1 max-w-md text-muted">La revisamos y en breve se publica en la web.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className={cn("flex flex-col items-center gap-3 text-center", hasItems ? "mt-5" : "glass glass-lime rounded-3xl p-8")}>
        {!hasItems && <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase">Tu opinión cuenta</p>}
        <p className="max-w-md text-muted">{hasItems ? "¿Venís a entrenar o a jugar? Contanos cómo te fue." : "Contanos cómo fue tu experiencia y ayudá a otros a elegir."}</p>
        <button type="button" onClick={() => setOpen(true)} className="cta-sheen relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-lime px-6 font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-black transition hover:bg-lime-dark">
          <Star size={18} aria-hidden /> Dejar mi opinión
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="glass step-enter mt-4 flex flex-col gap-4 rounded-3xl p-5 sm:p-7">
      <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase">Dejá tu opinión</h3>
      <div role="radiogroup" aria-label="Estrellas" className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} className="rv-star p-1">
            <Star size={34} className={n <= shown ? "fill-lime text-lime" : "text-border"} />
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">Tu nombre<input className={input} value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} maxLength={80} autoComplete="name" required /></label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Detalle <span className="font-normal text-muted">(opcional, ej. mamá de un alumno)</span><input className={input} value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} maxLength={80} /></label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Tu opinión
        <textarea className={cn(input, "h-28 resize-none py-3")} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={500} required />
        <span className="self-end text-xs font-normal text-muted">{f.body.length}/500</span>
      </label>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>No completar<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></label></div>
      {error && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="tr-send cta-sheen relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-lime px-6 font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-black transition hover:bg-lime-dark disabled:opacity-60"><Send size={18} aria-hidden />{pending ? "Enviando…" : "Enviar opinión"}</button>
        <button type="button" onClick={() => setOpen(false)} className="h-12 rounded-xl border border-border px-5 font-medium">Cancelar</button>
        <p className="text-xs text-muted">Se publica cuando la revisamos.</p>
      </div>
    </form>
  );
}
