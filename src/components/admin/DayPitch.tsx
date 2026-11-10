import { formatTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { DayPitchCourt } from "@/queries/admin";

type Named = { start_at: string; end_at: string; customer_name: string; status: string };

const LABEL: Record<string, string> = { available: "Libre", full: "Ocupado", blocked: "Bloqueado", past: "Pasado" };

/** La agenda del día dibujada como una cancha: cada horario es una franja con su estado. */
export function DayPitch({ courts, bookings }: { courts: DayPitchCourt[]; bookings: Named[] }) {
  if (!courts.some((c) => c.slots.length)) return null;
  const live = bookings.filter((b) => b.status !== "cancelled");
  return (
    <section aria-label="Vista de cancha" className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold uppercase">Vista de cancha</h2>
      <div className="flex flex-col gap-4">
        {courts.map((c) => (
          <div key={c.id}>
            {courts.length > 1 && <p className="mb-1 text-sm font-semibold text-muted">{c.name}</p>}
            <ol className="day-pitch flex overflow-x-auto rounded-xl border-2 border-white/70 [scrollbar-width:thin]">
              {c.slots.map((s, i) => {
                const who = live.find((b) => b.start_at <= s.start && s.start < b.end_at)?.customer_name;
                const kind = s.state === "available" ? (s.hasPending ? "pending" : "free") : s.state === "full" ? "busy" : s.state;
                return (
                  <li
                    key={s.start}
                    style={{ animationDelay: `${i * 50}ms` }}
                    className={cn(
                      "pitch-slot flex min-w-[5.5rem] flex-1 flex-col items-center justify-center gap-0.5 border-r border-white/40 px-1 py-4 text-center last:border-r-0",
                      kind === "free" && "pitch-free",
                      kind === "pending" && "pitch-pending",
                      kind === "busy" && "pitch-busy",
                      (kind === "blocked" || kind === "past") && "pitch-off",
                    )}
                  >
                    <span className="font-[family-name:var(--font-display)] text-lg font-bold leading-none">{formatTime(s.start)}</span>
                    <span className="max-w-full truncate text-[11px] font-semibold uppercase tracking-wide">
                      {kind === "busy" ? who ?? LABEL.full : kind === "pending" ? (who ?? "Pendiente") : LABEL[s.state] ?? s.state}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-lime/70" /> Libre</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-warning/80" /> Pendiente</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-danger/70" /> Ocupado</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-black/40" /> Bloqueado / pasado</li>
      </ul>
    </section>
  );
}
