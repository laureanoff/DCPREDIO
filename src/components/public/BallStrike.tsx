"use client";

import { useEffect, useRef } from "react";

const GHOSTS = [0.045, 0.09, 0.14]; // cuánto "atrás en el tiempo" va cada estela

/**
 * Transición al bajar: la pelota (foto real) sale de lejos, "pateada", gira y viene derecho hacia vos hasta taparte la pantalla;
 * al llegar estalla en un destello y deja ver la sección siguiente. Se controla con el scroll (sube/baja con vos).
 */
export function BallStrike() {
  const wrap = useRef<HTMLDivElement>(null);
  const ball = useRef<HTMLDivElement>(null);
  const ghosts = useRef<(HTMLDivElement | null)[]>([]);
  const lines = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const shock = useRef<HTMLDivElement>(null);
  const dust = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLParagraphElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = wrap.current;
    if (!w || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;

    // Posición/tamaño de la pelota en el instante t (0 = recién pateada, 1 = encima tuyo).
    const pose = (t: number) => {
      const c = Math.min(1, Math.max(0, t));
      const e = Math.pow(c, 3);
      return {
        x: -30 + c * 30 + Math.sin(c * Math.PI) * 7,
        y: 24 - c * 24 - Math.sin(c * Math.PI) * 12,
        s: 0.04 + e * 16,
        r: c * 1080,
      };
    };

    const update = () => {
      raf = 0;
      const r = w.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      const t = Math.min(1, p / 0.84);
      const e = Math.pow(t, 3);
      const out = Math.min(1, Math.max(0, (p - 0.86) / 0.07)); // 0→1: la pelota "estalla" y desaparece
      const speed = Math.min(1, e * 2.2);

      const place = (el: HTMLElement | null, tt: number, op: number, blur: number) => {
        if (!el) return;
        const q = pose(tt);
        // estirada en el sentido del vuelo cuando va rápido; leve aplastada al salir (la patada)
        const kick = tt < 0.12 ? Math.sin((tt / 0.12) * Math.PI) * 0.18 : 0;
        const sx = 1 + speed * 0.1 + kick;
        const sy = 1 - speed * 0.06 - kick * 0.8;
        el.style.transform = `translate3d(${q.x}vw, ${q.y}vh, 0) scale(${q.s}) rotate(${q.r}deg) scale(${sx}, ${sy})`;
        el.style.opacity = String(op);
        el.style.filter = `${blur > 0.1 ? `blur(${blur}px) ` : ""}drop-shadow(0 12px 16px rgba(0,0,0,.5))`;
      };

      const vis = Math.min(1, p * 16) * (1 - out);
      place(ball.current, t, vis, Math.max(0, (t - 0.6) * 6) + out * 18);
      GHOSTS.forEach((g, i) => place(ghosts.current[i], Math.max(0, t - g * (0.4 + speed)), vis * (0.34 - i * 0.1) * Math.min(1, speed * 3), 3 + i * 3 + Math.max(0, (t - 0.6) * 6)));

      if (ball.current) ball.current.style.boxShadow = "none";
      if (lines.current) {
        lines.current.style.opacity = String(Math.min(0.85, e * 1.8) * (1 - out));
        lines.current.style.transform = `scale(${1 + e * 1.6}) rotate(${t * 40}deg)`;
      }
      if (dust.current) {
        const d = Math.max(0, 1 - t * 4);
        dust.current.style.opacity = String(d * Math.min(1, p * 30));
        dust.current.style.transform = `translate(-50%, 0) scale(${1 + (1 - d) * 2})`;
      }
      if (flash.current) {
        const f = Math.max(0, 1 - Math.abs(p - 0.87) / 0.07);
        flash.current.style.opacity = String(f * 0.95);
      }
      if (shock.current) {
        const s = Math.max(0, (p - 0.84) / 0.12);
        shock.current.style.opacity = String(Math.sin(Math.min(1, s) * Math.PI) * 0.9);
        shock.current.style.transform = `translate(-50%,-50%) scale(${0.3 + s * 3.4})`;
      }
      if (text.current) {
        const a = p < 0.3 ? Math.max(0, p / 0.12) : Math.max(0, 1 - (p - 0.3) / 0.18);
        text.current.style.opacity = String(Math.min(1, a));
        text.current.style.transform = `translateY(${(1 - Math.min(1, a)) * 20}px)`;
      }
      if (stage.current) stage.current.style.setProperty("--shake", String(out > 0 && out < 1 ? 1 : 0));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/trainings/ball.webp" alt="" draggable={false} className="h-full w-full select-none object-contain" />
  );

  return (
    <div ref={wrap} className="ball-strike" aria-hidden>
      <div ref={stage} className="ball-strike-stick">
        <p ref={text} className="ball-strike-text">¡Atenti, viene la pelota!</p>
        <div ref={lines} className="ball-strike-lines" />
        <div ref={dust} className="ball-strike-dust" />
        {GHOSTS.map((_, i) => <div key={i} ref={(el) => { ghosts.current[i] = el; }} className="ball-strike-ball ball-strike-ghost">{img}</div>)}
        <div ref={ball} className="ball-strike-ball">{img}</div>
        <div ref={shock} className="ball-strike-shock" />
        <div ref={flash} className="ball-strike-flash" />
      </div>
      <div className="ball-strike-static"><div className="h-28 w-28">{img}</div></div>
    </div>
  );
}
