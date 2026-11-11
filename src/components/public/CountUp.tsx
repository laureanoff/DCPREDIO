"use client";

import { useEffect, useRef } from "react";
import { formatMoney } from "@/lib/utils";

/** Importe que sube contando desde 0 cada vez que entra en pantalla. Sin JS o con "reducir movimiento" muestra el valor final. */
export function CountUp({ value, currency, className, ms = 1500 }: { value: number; currency?: string; className?: string; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / ms);
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = formatMoney(Math.round(value * eased), currency);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => { for (const e of entries) if (e.isIntersecting) run(); }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, currency, ms]);
  return <span ref={ref} className={className} suppressHydrationWarning>{formatMoney(value, currency)}</span>;
}
