import Link from "next/link";
import { cn, formatMoney } from "@/lib/utils";

export type ChartBar = { key: string; label: string; value: number; count: number; href?: string };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(v));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

const compact = (n: number) =>
  new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Gráfico de barras de una sola serie (ingresos). Tooltip por barra, ejes discretos y tabla equivalente. */
export function IncomeChart({ bars, title, unitLabel }: { bars: ChartBar[]; title: string; unitLabel: string }) {
  const max = niceMax(Math.max(0, ...bars.map((b) => b.value)));
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => f * max);
  const dense = bars.length > 12;

  return (
    <figure className="rounded-2xl border border-border bg-surface p-4">
      <figcaption className="mb-4 text-sm font-semibold">{title}</figcaption>

      <div className="flex gap-2">
        <div className="relative h-56 w-12 shrink-0 text-right text-[11px] text-muted" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / max) * 100}%` }}>
              {t === 0 ? "0" : `$${compact(t)}`}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56" aria-hidden>
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-border/60" style={{ top: `${100 - (t / max) * 100}%` }} />
            ))}
          </div>

          <ol className="relative flex h-56 items-end gap-[2px] sm:gap-1">
            {bars.map((b, i) => {
              const h = (b.value / max) * 100;
              const body = (
                <>
                  <span
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max -translate-x-1/2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-lg group-hover:block group-focus-visible:block"
                    role="tooltip"
                  >
                    <span className="block font-semibold">{b.label}</span>
                    <span className="block">{formatMoney(b.value)}</span>
                    <span className="block text-muted">{b.count} {b.count === 1 ? "cobro" : "cobros"}</span>
                  </span>
                  <span
                    className={cn("bar-grow block w-full rounded-t-[4px] bg-lime-ink transition-opacity group-hover:opacity-80", b.value === 0 && "opacity-0")}
                    style={{ height: `${Math.max(h, b.value > 0 ? 1.5 : 0)}%`, animationDelay: `${Math.min(i, 30) * 40}ms` }}
                  />
                </>
              );
              const cls = "group relative flex h-full w-full items-end justify-center outline-none";
              return (
                <li key={b.key} className="h-full min-w-0 flex-1">
                  {b.href ? (
                    <Link href={b.href} className={cls} aria-label={`${b.label}: ${formatMoney(b.value)}, ${b.count} cobros. Ver detalle por día`}>
                      {body}
                    </Link>
                  ) : (
                    <div tabIndex={0} className={cls} aria-label={`${b.label}: ${formatMoney(b.value)}, ${b.count} cobros`}>
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <ol className="mt-1 flex gap-[2px] sm:gap-1" aria-hidden>
            {bars.map((b, i) => (
              <li key={b.key} className="min-w-0 flex-1 text-center text-[11px] text-muted">
                {dense && i % 2 === 1 ? "" : b.label.split(" ")[0]}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">{unitLabel}</p>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-foreground">Ver como tabla</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-xs uppercase text-muted">
            <tr><th className="py-1 font-medium">Período</th><th className="py-1 text-right font-medium">Cobros</th><th className="py-1 text-right font-medium">Total</th></tr>
          </thead>
          <tbody>
            {bars.map((b) => (
              <tr key={b.key} className="border-t border-border/60">
                <td className="py-1">{b.label}</td>
                <td className="py-1 text-right">{b.count}</td>
                <td className="py-1 text-right font-medium">{formatMoney(b.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
