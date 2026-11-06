"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { deleteGalleryItem, moveGalleryItem, renameGalleryItem, setGalleryActive } from "./actions";

export type GalleryRow = { id: string; kind: string; url: string; posterUrl: string | null; title: string; isActive: boolean };

function Row({ item, first, last }: { item: GalleryRow; first: boolean; last: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(item.title);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: (r.ok ? r.message : r.error) ?? "" });
      if (r.ok) router.refresh();
    });
  }
  const btn = "flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:border-lime hover:text-foreground disabled:opacity-40";

  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-3 ${item.isActive ? "" : "opacity-60"}`}>
      <div className="h-24 w-14 shrink-0 overflow-hidden rounded-xl bg-black">
        {item.kind === "video" ? (
          <video src={item.url} poster={item.posterUrl ?? undefined} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>

      <div className="min-w-48 flex-1">
        <p className="text-xs uppercase tracking-wide text-muted">{item.kind === "video" ? "Video" : "Foto"}{item.isActive ? "" : " · oculto"}</p>
        <div className="mt-1 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Sin título"
            aria-label="Título"
            className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-lime"
          />
          {title !== item.title && (
            <button type="button" disabled={pending} onClick={() => run(() => renameGalleryItem(item.id, title))} className="h-9 rounded-lg bg-lime px-3 text-sm font-semibold text-black disabled:opacity-60">
              Guardar
            </button>
          )}
        </div>
        {msg && <p role="status" className={`mt-1 text-xs ${msg.ok ? "text-lime-ink" : "text-danger"}`}>{msg.text}</p>}
      </div>

      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Subir" disabled={pending || first} onClick={() => run(() => moveGalleryItem(item.id, -1))} className={btn}><ArrowUp size={16} /></button>
        <button type="button" aria-label="Bajar" disabled={pending || last} onClick={() => run(() => moveGalleryItem(item.id, 1))} className={btn}><ArrowDown size={16} /></button>
        <button type="button" aria-label={item.isActive ? "Ocultar de la web" : "Mostrar en la web"} title={item.isActive ? "Ocultar de la web" : "Mostrar en la web"} disabled={pending} onClick={() => run(() => setGalleryActive(item.id, !item.isActive))} className={btn}>
          {item.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        {!confirming ? (
          <button type="button" aria-label="Eliminar" disabled={pending} onClick={() => setConfirming(true)} className={`${btn} hover:!border-danger hover:!text-danger`}><Trash2 size={16} /></button>
        ) : (
          <span className="flex items-center gap-1.5">
            <button type="button" disabled={pending} onClick={() => run(() => deleteGalleryItem(item.id))} className="h-9 rounded-lg bg-danger px-3 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? "…" : "Eliminar"}
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="h-9 rounded-lg border border-border px-3 text-sm">No</button>
          </span>
        )}
      </div>
    </li>
  );
}

export function GalleryList({ items }: { items: GalleryRow[] }) {
  if (items.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-muted">Todavía no hay videos ni fotos. Subí el primero arriba.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((it, i) => <Row key={it.id} item={it} first={i === 0} last={i === items.length - 1} />)}
    </ul>
  );
}
