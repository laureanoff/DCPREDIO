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
export function TurnTimer({
  startAt,
  endAt,
  startedAt,
  finishedAt,
  large,
}: {
  startAt: string;
  endAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  large?: boolean;
}) {
  const now = useNow();
  if (now === 0) return <span className="text-sm text-muted" aria-hidden>--:--</span>;

  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const sz = large ? "text-lg" : "text-sm";
  const ic = large ? 20 : 14;

  if (startedAt) {
    const real = new Date(startedAt).getTime();
    const stop = finishedAt ? new Date(finishedAt).getTime() : null;
    const extra = (stop ?? now) - end;
    const delay = real - start;
    const delayTxt = delay > 60_000 ? ` · arrancó ${Math.round(delay / 60_000)} min tarde` : "";
    if (stop) {
      return (
        <span className={cn("flex flex-col gap-0.5 text-muted", sz)}>
          <span className="inline-flex items-center gap-1.5"><Flag size={ic} aria-hidden /> Turno finalizado · duró <strong className="font-mono text-foreground">{clock(stop - real)}</strong></span>
          {extra > 60_000 && <span className="text-sm text-warning">Tiempo extra: +{clock(extra)}</span>}
          {delayTxt && <span className="text-xs">{delayTxt.slice(3)}</span>}
        </span>
      );
    }
    const pct = Math.min(100, ((now - real) / Math.max(1, end - real)) * 100);
    return (
      <span className={cn("flex flex-col gap-1", sz)} role="timer" aria-label="Turno en juego">
        <span className={cn("inline-flex items-center gap-1.5 font-semibold", extra > 0 ? "text-warning" : "text-lime-ink")}>
          <Play size={ic} aria-hidden /> En juego · lleva <span className="font-mono">{clock(now - real)}</span>
        </span>
        {extra > 0 ? (
          <span className="text-sm font-semibold text-warning">Tiempo extra +<span className="font-mono">{clock(extra)}</span></span>
        ) : (
          <>
            <span className="text-sm text-muted">Termina según reserva en <span className="font-mono">{clock(end - now)}</span></span>
            <span className="h-1.5 w-full min-w-32 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <span className="block h-full rounded-full bg-lime" style={{ width: `${pct}%` }} />
            </span>
          </>
        )}
        {delayTxt && <span className="text-xs text-muted">{delayTxt.slice(3)}</span>}
      </span>
    );
  }

  if (now >= start && now < end) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 font-semibold text-warning", sz)} role="timer">
        <Timer size={ic} aria-hidden /> Sin iniciar · pasaron <span className="font-mono">{clock(now - start)}</span> de la hora
      </span>
    );
  }

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
