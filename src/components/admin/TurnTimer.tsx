"use client";

import { Play, Timer, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNow } from "./useNow";

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Cronómetro del turno: cuenta regresiva hasta el comienzo, luego hasta el final. */
export function TurnTimer({ startAt, endAt, large }: { startAt: string; endAt: string; large?: boolean }) {
  const now = useNow();
  if (now === 0) return <span className="text-sm text-muted" aria-hidden>--:--</span>;

  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();

  if (now < start) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-muted", large ? "text-lg" : "text-sm")} role="timer" aria-label="Tiempo para que comience el turno">
        <Timer size={large ? 20 : 14} aria-hidden /> Comienza en <strong className="font-mono text-foreground">{clock(start - now)}</strong>
      </span>
    );
  }
  if (now < end) {
    const left = end - now;
    const pct = Math.min(100, ((now - start) / (end - start)) * 100);
    return (
      <span className={cn("flex flex-col gap-1", large ? "text-lg" : "text-sm")} role="timer" aria-label="Tiempo restante del turno">
        <span className={cn("inline-flex items-center gap-1.5 font-semibold", left <= 5 * 60_000 ? "text-warning" : "text-lime-ink")}>
          <Play size={large ? 20 : 14} aria-hidden /> En juego · termina en <span className="font-mono">{clock(left)}</span>
        </span>
        <span className="h-1.5 w-full min-w-32 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <span className="block h-full rounded-full bg-lime" style={{ width: `${pct}%` }} />
        </span>
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-muted", large ? "text-lg" : "text-sm")}>
      <Flag size={large ? 20 : 14} aria-hidden /> Turno finalizado
    </span>
  );
}
