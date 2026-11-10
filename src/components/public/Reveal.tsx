"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Aparece con fundido y desplazamiento al entrar en pantalla y se desvanece al salir (ida y vuelta). */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          e.target.classList.toggle("is-visible", e.isIntersecting);
        }
      },
      { threshold: 0.1, rootMargin: "-6% 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={cn("reveal", className)}>{children}</div>;
}
