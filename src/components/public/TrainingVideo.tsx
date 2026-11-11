"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

const SRC = "/trainings/entrenamiento.mp4";
const POSTER = "/trainings/entrenamiento.jpg";

/**
 * Video de entrenamiento. Solo se reproduce mientras se ve (y sin "reducir movimiento" queda el póster).
 * variant="backdrop": fondo desenfocado detrás del vidrio. variant="player": reproductor con botón de sonido.
 */
export function TrainingVideo({ variant = "player", className }: { variant?: "backdrop" | "player"; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const v = ref.current;
    if (!v || mq.matches) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) void v.play().catch(() => {}); else v.pause(); },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  useEffect(() => { if (ref.current) ref.current.muted = muted; }, [muted]);

  const video = (
    <video
      ref={ref}
      src={SRC}
      poster={POSTER}
      muted
      loop
      playsInline
      preload={variant === "backdrop" ? "none" : "metadata"}
      aria-hidden={variant === "backdrop" ? true : undefined}
      className="h-full w-full object-cover"
    />
  );
  if (variant === "backdrop") return <div className={cn("tr-vid", className)}>{video}</div>;
  return (
    <div className={cn("relative overflow-hidden rounded-3xl bg-black", className)}>
      {video}
      <button
        type="button"
        aria-label={muted ? "Activar sonido" : "Silenciar"}
        onClick={() => setMuted((m) => !m)}
        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  );
}
