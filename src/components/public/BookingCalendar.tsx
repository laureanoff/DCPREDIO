"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateKey, daysInMonth, monthLabel } from "@/lib/datetime";

export type MonthDay = { day: string; is_open: boolean; total_slots: number; free_slots: number };

type Props = {
  year: number;
  month: number;
  /** null mientras se carga el mes */
  days: Record<string, MonthDay> | null;
  today: string;
  maxDate: string;
  selected: string | null;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (key: string) => void;
};

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export function BookingCalendar({
  year, month, days, today, maxDate, selected, canPrev, canNext, onPrev, onNext, onSelect,
}: Props) {
  const firstDow = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // lunes = 0
  const total = daysInMonth(year, month);
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Mes anterior"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border transition enabled:hover:border-lime enabled:hover:text-lime disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-wide">
          {monthLabel(year, month)}
        </h3>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Mes siguiente"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border transition enabled:hover:border-lime enabled:hover:text-lime disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      <div className={cn("mt-1 grid grid-cols-7 gap-1.5", days === null && "animate-pulse")} aria-busy={days === null}>
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const key = dateKey(year, month, d);
          const info = days?.[key];
          const isPast = key < today;
          const isOut = key > maxDate;
          const isSelected = key === selected;

          let kind: "loading" | "past" | "closed" | "full" | "open";
          if (isPast || isOut) kind = "past";
          else if (!info) kind = "loading";
          else if (!info.is_open) kind = "closed";
          else if (info.free_slots === 0) kind = "full";
          else kind = "open";

          const clickable = kind === "open";
          const label =
            kind === "open" ? `${d}: hay turnos disponibles`
            : kind === "full" ? `${d}: sin turnos disponibles`
            : kind === "closed" ? `${d}: cerrado`
            : `${d}`;

          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              aria-label={label}
              aria-pressed={isSelected}
              onClick={() => onSelect(key)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-xl border text-base font-semibold transition",
                kind === "open" && !isSelected && "border-lime/40 bg-lime/10 text-lime hover:bg-lime/25",
                kind === "open" && isSelected && "border-lime bg-lime text-black",
                kind === "full" && "border-danger/30 bg-danger/10 text-danger/80",
                kind === "closed" && "border-transparent bg-surface-2 text-muted/50",
                kind === "past" && "border-transparent text-muted/30",
                kind === "loading" && "border-transparent bg-surface-2 text-transparent",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-lime/70" /> Disponible</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-danger/60" /> Completo</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-surface-2 ring-1 ring-border" /> Cerrado</li>
      </ul>
    </div>
  );
}
