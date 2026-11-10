"use client";

import Link from "next/link";
import { useNow } from "./useNow";

type B = { id: string; name: string; startAt: string; endAt: string; players: number };

const pad = (n: number) => String(n).padStart(2, "0");
function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Cuenta regresiva grande del turno en juego o del próximo del día. */
export function NextTurn({ bookings }: { bookings: B[] }) {
  const now = useNow();
  const live = now ? bookings.find((b) => new Date(b.startAt).getTime() <= now && now < new Date(b.endAt).getTime()) : undefined;
  const next = now ? bookings.find((b) => new Date(b.startAt).getTime() > now) : undefined;
  const target = live ?? next;

  return (
    <section aria-label="Próximo turno" className="next-turn relative overflow-hidden rounded-2xl border border-lime/40 bg-surface p-5">
      <svg aria-hidden viewBox="0 0 300 120" className="pointer-events-none absolute -right-6 top-1/2 h-40 -translate-y-1/2 text-lime-ink opacity-[0.12]" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="292" height="112" rx="4" /><line x1="150" y1="4" x2="150" y2="116" /><circle cx="150" cy="60" r="26" />
        <rect x="4" y="30" width="44" height="60" /><rect x="252" y="30" width="44" height="60" />
      </svg>
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-ink">
            <span className="live-dot" aria-hidden />
            {live ? "En juego ahora" : next ? "Próximo turno" : "Agenda del día"}
          </p>
          {target ? (
            <>
              <Link href={`/admin/reservas/${target.id}`} className="mt-1 block font-[family-name:var(--font-display)] text-2xl font-bold hover:text-lime-ink">
                {target.name}
              </Link>
              <p className="text-sm text-muted">{target.players} jugadores</p>
            </>
          ) : (
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold">{now ? "No quedan turnos por jugar hoy" : "—"}</p>
          )}
        </div>
        {target && now > 0 && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted">{live ? "Termina en" : "Empieza en"}</p>
            <p className="font-[family-name:var(--font-display)] text-5xl font-extrabold tabular-nums tracking-wider" aria-live="off">
              {clock((live ? new Date(target.endAt).getTime() : new Date(target.startAt).getTime()) - now)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
