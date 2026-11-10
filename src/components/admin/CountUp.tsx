"use client";

import { useEffect, useRef } from "react";
import { formatMoney } from "@/lib/utils";

/** Número que sube desde cero al aparecer. El HTML del servidor ya trae el valor final (sin parpadeo ni JS). */
export function CountUp({ value, money = false, duration = 1100 }: { value: number; money?: boolean; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) => (money ? formatMoney(Math.round(n)) : String(Math.round(n)));

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || value === 0) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = fmt(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    el.textContent = fmt(0);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); el.textContent = fmt(value); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, money, duration]);

  return <span ref={ref} suppressHydrationWarning>{fmt(value)}</span>;
}
