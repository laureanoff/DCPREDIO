"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import type { MediaItem } from "@/config/media";
import { cn } from "@/lib/utils";

/**
 * Carrusel de tarjetas verticales con esquinas redondeadas. Los videos arrancan solos
 * (sin sonido) cuando se ven en pantalla y se pausan al salir.
 */
export function MediaCarousel({ items }: { items: MediaItem[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting && e.intersectionRatio >= 0.6) void v.play().catch(() => {});
          else v.pause();
        }
      },
      { root: el, threshold: [0, 0.6, 1] },
    );
    el.querySelectorAll("video").forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [items]);

  useEffect(() => {
    track.current?.querySelectorAll("video").forEach((v) => { v.muted = muted; });
  }, [muted]);

  function step(dir: 1 | -1) {
    const el = track.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: "smooth" });
  }
  function onScroll() {
    const el = track.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (el && card) setIndex(Math.round(el.scrollLeft / (card.offsetWidth + 16)));
  }

  const many = items.length > 1;
  const hasVideo = items.some((i) => i.type === "video");

  return (
    <div className="relative mx-auto w-fit max-w-full">
      <div
        ref={track}
        onScroll={onScroll}
        role="region"
        aria-roledescription="carrusel"
        aria-label="Galería del predio"
        className="flex max-w-full snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((m) => (
          <div
            key={m.src}
            className="relative aspect-[9/16] w-[min(78vw,19rem)] shrink-0 snap-center overflow-hidden rounded-3xl border border-border bg-black sm:w-80"
          >
            {m.type === "video" ? (
              <video
                src={m.src}
                poster={m.poster}
                title={m.title}
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.src} alt={m.title} className="h-full w-full object-cover" loading="lazy" />
            )}
          </div>
        ))}
      </div>

      {hasVideo && (
        <button
          type="button"
          aria-label={muted ? "Activar sonido" : "Silenciar"}
          onClick={() => setMuted((v) => !v)}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}

      {many && (
        <>
          <button type="button" aria-label="Anterior" onClick={() => step(-1)} disabled={index === 0}
            className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-30">
            <ChevronLeft size={22} />
          </button>
          <button type="button" aria-label="Siguiente" onClick={() => step(1)} disabled={index >= items.length - 1}
            className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-30">
            <ChevronRight size={22} />
          </button>
          <div className="mt-3 flex justify-center gap-1.5">
            {items.map((m, i) => (
              <span key={m.src} className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-lime" : "w-2 bg-border")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
