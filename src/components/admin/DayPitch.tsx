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
            <div className="day-pitch relative aspect-[2/1] min-h-56 w-full overflow-hidden rounded-2xl border-[3px] border-white/80">
              <svg aria-hidden viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="0.9" vectorEffect="non-scaling-stroke">
                <line x1="100" y1="0" x2="100" y2="100" />
                <circle cx="100" cy="50" r="14" />
                <rect x="0" y="22" width="24" height="56" />
                <rect x="176" y="22" width="24" height="56" />
                <rect x="0" y="38" width="8" height="24" />
                <rect x="192" y="38" width="8" height="24" />
              </svg>
              <ol className="relative grid h-full content-center gap-2 p-3 sm:p-5 [grid-template-columns:repeat(auto-fit,minmax(5.75rem,1fr))]">
                {c.slots.map((s, i) => {
                  const who = live.find((b) => b.start_at <= s.start && s.start < b.end_at)?.customer_name;
                  const kind = s.state === "available" ? (s.hasPending ? "pending" : "free") : s.state === "full" ? "busy" : s.state;
                  return (
                    <li
                      key={s.start}
                      style={{ animationDelay: `${i * 50}ms` }}
                      className={cn(
                        "pitch-slot flex flex-col items-center justify-center gap-0.5 rounded-xl border border-white/50 px-1 py-3 text-center backdrop-blur-[2px]",
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
