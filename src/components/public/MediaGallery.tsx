"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import type { GalleryMedia } from "@/queries/gallery";

function Thumb({ m, i, onOpen }: { m: GalleryMedia; i: number; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) void v.play().catch(() => {}); else v.pause(); }, { threshold: 0.5 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Ver ${m.title || (m.type === "video" ? "video" : "foto")}`}
      style={{ "--i": i } as React.CSSProperties}
      className="media-card tr-in glass group relative aspect-[9/16] overflow-hidden rounded-3xl bg-black p-0 text-left"
    >
      {m.type === "video" ? (
        <video ref={ref} src={m.src} poster={m.poster ?? undefined} muted loop playsInline preload="metadata" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.src} alt={m.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      )}
      {m.type === "video" && (
        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur" aria-hidden><Play size={14} fill="currentColor" /></span>
      )}
      {m.title && <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3.5 pb-3 pt-10 text-sm font-semibold text-white">{m.title}</span>}
    </button>
  );
}

/** Galería en cuadrícula (no carrusel): los videos se mueven solos mientras se ven y al tocar uno se abre grande, con sonido. */
export function MediaGallery({ items }: { items: GalleryMedia[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((o) => (o === null ? o : (o + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, close, step]);

  const cur = open === null ? null : items[open];
  const touchX = useRef<number | null>(null);

  return (
    <>
      <div role="region" aria-label="Galería del predio" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {items.map((m, i) => <Thumb key={m.id} m={m} i={i} onOpen={() => setOpen(i)} />)}
      </div>

      {cur && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={cur.title || "Galería"}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl"
          onClick={close}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
          }}
        >
          <div className="glass relative max-h-full overflow-hidden rounded-3xl bg-black" onClick={(e) => e.stopPropagation()}>
            {cur.type === "video" ? (
              <video key={cur.id} src={cur.src} poster={cur.poster ?? undefined} autoPlay loop playsInline controls className="max-h-[85dvh] max-w-[92vw] object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={cur.id} src={cur.src} alt={cur.title} className="max-h-[85dvh] max-w-[92vw] object-contain" />
            )}
            {cur.title && <p className="px-4 py-3 text-sm font-semibold text-white">{cur.title}</p>}
          </div>
          <button type="button" aria-label="Cerrar" onClick={close} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"><X size={22} /></button>
          {items.length > 1 && (
            <>
              <button type="button" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); step(-1); }} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"><ChevronLeft size={24} /></button>
              <button type="button" aria-label="Siguiente" onClick={(e) => { e.stopPropagation(); step(1); }} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"><ChevronRight size={24} /></button>
            </>
          )}
        </div>
      )}
    </>
  );
}
