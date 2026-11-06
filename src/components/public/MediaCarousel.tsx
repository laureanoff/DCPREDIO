"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import type { GalleryMedia } from "@/queries/gallery";
import { cn } from "@/lib/utils";

const GAP = 16; // px (gap-4)
const ADVANCE_MS = 7000; // tiempo entre movimientos automáticos
const GLIDE_MS = 1600; // duración del desplazamiento: lento y suave
const PAUSE_AFTER_TOUCH_MS = 12000;

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Carrusel de tarjetas verticales con esquinas redondeadas. Avanza solo, despacio.
 * Se detiene si la persona lo toca o pasa el mouse. Los videos se reproducen (sin sonido) solo mientras se ven.
 */
export function MediaCarousel({ items }: { items: GalleryMedia[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const pausedUntil = useRef(0);
  const hovering = useRef(false);
  const gliding = useRef(false);

  const cardStep = useCallback(() => {
    const card = track.current?.firstElementChild as HTMLElement | null;
    return card ? card.offsetWidth + GAP : 0;
  }, []);

  // Desplazamiento suave y lento hasta una posición (sin pelear con el "snap" del navegador).
  const glide = useCallback((to: number, duration = GLIDE_MS) => {
    const el = track.current;
    if (!el || gliding.current) return;
    const from = el.scrollLeft;
    if (Math.abs(to - from) < 1) return;
    gliding.current = true;
    el.style.scrollSnapType = "none";
    el.style.scrollBehavior = "auto";
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      el.scrollLeft = from + (to - from) * easeInOut(t);
      if (t < 1) requestAnimationFrame(frame);
      else {
        el.style.scrollSnapType = "";
        el.style.scrollBehavior = "";
        gliding.current = false;
      }
    };
    requestAnimationFrame(frame);
  }, []);

  const goTo = useCallback((i: number, userInitiated = false) => {
    const el = track.current;
    if (!el) return;
    if (userInitiated) pausedUntil.current = Date.now() + PAUSE_AFTER_TOUCH_MS;
    const maxScroll = el.scrollWidth - el.clientWidth;
    glide(Math.min(Math.max(0, i * cardStep()), maxScroll));
  }, [cardStep, glide]);

  // Movimiento automático.
  useEffect(() => {
    if (items.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      const el = track.current;
      if (!el || document.hidden || hovering.current || Date.now() < pausedUntil.current) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll < 2) return; // todas las tarjetas caben en pantalla: nada que mover
      const atEnd = el.scrollLeft >= maxScroll - 2;
      if (atEnd) glide(0, GLIDE_MS * 1.6);
      else glide(Math.min(maxScroll, el.scrollLeft + cardStep()));
    }, ADVANCE_MS);
    return () => clearInterval(timer);
  }, [items.length, glide, cardStep]);

  // Reproducir solo los videos visibles.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting && e.intersectionRatio >= 0.5) void v.play().catch(() => {});
          else v.pause();
        }
      },
      { root: el, threshold: [0, 0.5, 1] },
    );
    el.querySelectorAll("video").forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [items]);

  useEffect(() => {
    track.current?.querySelectorAll("video").forEach((v) => { v.muted = muted; });
  }, [muted]);

  function onScroll() {
    const el = track.current;
    const step = cardStep();
    if (el && step) setIndex(Math.round(el.scrollLeft / step));
  }

  const many = items.length > 1;
  // En pantallas grandes se ven hasta 3 tarjetas, pero siempre queda alguna fuera para que el carrusel tenga recorrido.
  const visible = Math.min(3, Math.max(1, items.length - 1));
  const viewportWidth = `${visible * 320 + (visible - 1) * GAP}px`;
  const hasVideo = items.some((i) => i.type === "video");

  return (
    <div
      className="relative mx-auto w-fit max-w-full"
      onMouseEnter={() => { hovering.current = true; }}
      onMouseLeave={() => { hovering.current = false; }}
      onTouchStart={() => { pausedUntil.current = Date.now() + PAUSE_AFTER_TOUCH_MS; }}
    >
      <div
        ref={track}
        onScroll={onScroll}
        role="region"
        aria-roledescription="carrusel"
        aria-label="Galería del predio"
        style={{ "--vw": viewportWidth } as React.CSSProperties}
        className="flex max-w-full snap-x snap-mandatory gap-4 overflow-x-auto sm:max-w-[var(--vw)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((m) => (
          <div
            key={m.id}
            className="relative aspect-[9/16] w-[min(78vw,19rem)] shrink-0 snap-center overflow-hidden rounded-3xl border border-border bg-black sm:w-80"
          >
            {m.type === "video" ? (
              <video
                src={m.src}
                poster={m.poster ?? undefined}
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
            {m.title && (
              <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-sm font-semibold text-white">
                {m.title}
              </p>
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
          <button type="button" aria-label="Anterior" onClick={() => goTo(index - 1, true)} disabled={index === 0}
            className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-30">
            <ChevronLeft size={22} />
          </button>
          <button type="button" aria-label="Siguiente" onClick={() => goTo(index + 1, true)} disabled={index >= items.length - 1}
            className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-30">
            <ChevronRight size={22} />
          </button>
          <div className="mt-3 flex justify-center gap-1.5">
            {items.map((m, i) => (
              <button key={m.id} type="button" aria-label={`Ir a ${i + 1}`} onClick={() => goTo(i, true)}
                className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-lime" : "w-2 bg-border")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
