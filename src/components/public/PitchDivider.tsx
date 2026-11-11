"use client";

import { useEffect, useRef } from "react";

/** Separador entre secciones: una línea de cancha que se dibuja y una pelota que rueda por ella al aparecer. Liviano (sin escuchar el scroll). */
export function PitchDivider() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--pd-w", `${el.clientWidth}px`);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="pd" aria-hidden>
      <span className="pd-line" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pd-ball" src="/trainings/ball.webp" alt="" width={60} height={60} loading="lazy" decoding="async" />
    </div>
  );
}
