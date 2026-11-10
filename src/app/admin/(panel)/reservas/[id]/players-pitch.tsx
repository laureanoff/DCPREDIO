"use client";

import { cn } from "@/lib/utils";

/** Posiciones (x, y en %) de cada jugador del equipo izquierdo: arquero, dos defensores, dos delanteros. */
const FORMATION: [number, number][] = [[7, 50], [23, 27], [23, 73], [40, 33], [40, 67]];

export const TEAM_A = "#2f7df6";
export const TEAM_B = "#f2662a";

export type PitchPlayer = { slot: number; paid: boolean; label: string };

/** Cancha de fútbol 5 vista de arriba: 5 jugadores por lado. Al cobrar a uno se pinta con el color de su equipo. */
export function PlayersPitch({
  players, selected, disabled, onPick,
}: {
  players: PitchPlayer[];
  selected: number | null;
  disabled?: boolean;
  onPick: (slot: number) => void;
}) {
  const perA = Math.ceil(players.length / 2);
  const team = (slot: number) => (slot <= perA ? "A" : "B");

  return (
    <div className="relative mx-auto aspect-[2/1] w-full max-w-3xl overflow-hidden rounded-2xl border-[3px] border-white/80 shadow-inner" style={{ background: "linear-gradient(#2d7a21,#256b1b)" }}>
      <div aria-hidden className="absolute inset-0" style={{ background: "repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 10%, rgba(0,0,0,.07) 10% 20%)" }} />
      <svg aria-hidden viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="0.9" vectorEffect="non-scaling-stroke">
        <line x1="100" y1="0" x2="100" y2="100" />
        <circle cx="100" cy="50" r="14" />
        <circle cx="100" cy="50" r="1.4" fill="rgba(255,255,255,.85)" />
        <rect x="0" y="22" width="24" height="56" />
        <rect x="176" y="22" width="24" height="56" />
        <rect x="0" y="38" width="8" height="24" />
        <rect x="192" y="38" width="8" height="24" />
        <path d="M24 40 A12 12 0 0 1 24 60" />
        <path d="M176 40 A12 12 0 0 0 176 60" />
      </svg>
      <span aria-hidden className="absolute left-0 top-1/2 h-[18%] w-[1.2%] -translate-y-1/2 bg-white/90" />
      <span aria-hidden className="absolute right-0 top-1/2 h-[18%] w-[1.2%] -translate-y-1/2 bg-white/90" />

      {players.map((p) => {
        const t = team(p.slot);
        const idx = t === "A" ? p.slot - 1 : p.slot - perA - 1;
        const [x, y] = FORMATION[idx] ?? [30, 50];
        const left = t === "A" ? x : 100 - x;
        const color = t === "A" ? TEAM_A : TEAM_B;
        const isSel = selected === p.slot;
        return (
          <button
            key={p.slot}
            type="button"
            disabled={disabled}
            onClick={() => onPick(p.slot)}
            aria-label={`Jugador ${p.slot}, equipo ${t === "A" ? "azul" : "naranja"}: ${p.label}`}
            aria-pressed={isSel}
            style={{ left: `${left}%`, top: `${y}%`, ["--team" as string]: color, background: p.paid ? color : "rgba(255,255,255,.9)", color: p.paid ? "#fff" : "#1b1b1b" }}
            className={cn(
              "player-dot absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-extrabold shadow-md transition sm:h-11 sm:w-11 sm:text-base",
              p.paid ? "player-paid border-white" : "border-white/70 hover:scale-110",
              isSel && "ring-4 ring-white/70",
              disabled && "cursor-default",
            )}
          >
            {p.slot}
          </button>
        );
      })}
    </div>
  );
}

export function PitchLegend() {
  return (
    <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted">
      <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: TEAM_A }} /> Equipo azul (izquierda)</li>
      <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: TEAM_B }} /> Equipo naranja (derecha)</li>
      <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-border bg-white" /> Falta cobrar</li>
    </ul>
  );
}
