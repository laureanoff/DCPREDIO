"use client";

import { useEffect, useRef } from "react";

/** Pelota de fútbol (SVG con sombreado) para la transición. */
function Ball() {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className="h-full w-full">
      <defs>
        <radialGradient id="bs-sh" cx="36%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".55" stopColor="#e9ece2" />
          <stop offset="1" stopColor="#8d9482" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#bs-sh)" />
      <g fill="#14170f">
        <path d="M100 66 131 88 119 124H81L69 88Z" />
        <path d="M100 66V30L124 22 146 40 131 88Z" opacity=".92" />
        <path d="M131 88 166 84 180 108 156 134 119 124Z" opacity=".92" />
        <path d="M119 124 138 160 120 182H80L62 160 81 124Z" opacity=".92" />
        <path d="M81 124 44 134 20 108 34 84 69 88Z" opacity=".92" />
        <path d="M69 88 54 40 76 22 100 30V66Z" opacity=".92" />
      </g>
      <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="3" />
    </svg>
  );
}

/**
 * Transición al bajar: la pelota sale de lejos, "pateada", y viene derecho hacia vos hasta taparte la pantalla;
 * después se funde con el fondo y aparece la sección siguiente. Se controla con el scroll (sube/baja con vos).
 */
export function BallStrike() {
  const wrap = useRef<HTMLDivElement>(null);
  const ball = useRef<HTMLDivElement>(null);
  const lines = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const shock = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const w = wrap.current;
    if (!w || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = w.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      const t = Math.min(1, p / 0.88); // el vuelo ocupa el 88 % del recorrido
      const e = Math.pow(t, 2.8);
      const scale = 0.035 + e * 17;
      const x = -26 + t * 26 + Math.sin(t * Math.PI) * 6; // sale del costado y se centra, con un poco de curva
      const y = 22 - t * 22 - Math.sin(t * Math.PI) * 10;
      if (ball.current) {
        ball.current.style.transform = `translate3d(${x}vw, ${y}vh, 0) scale(${scale}) rotate(${t * 900}deg)`;
        ball.current.style.filter = `blur(${Math.max(0, (t - 0.55) * 7)}px) drop-shadow(0 ${10 + e * 60}px ${20 + e * 80}px rgba(0,0,0,.6))`;
        ball.current.style.opacity = String(Math.min(1, p * 14));
      }
      if (lines.current) lines.current.style.opacity = String(Math.min(0.9, e * 1.6) * (p > 0.9 ? Math.max(0, (1 - p) * 10) : 1));
      if (lines.current) lines.current.style.transform = `scale(${1 + e * 1.4})`;
      if (shock.current) {
        const s = Math.max(0, (t - 0.82) / 0.18);
        shock.current.style.opacity = String(s * (1 - Math.max(0, (p - 0.94) / 0.06)));
        shock.current.style.transform = `translate(-50%,-50%) scale(${0.4 + s * 3})`;
      }
      if (veil.current) veil.current.style.opacity = String(Math.min(1, Math.max(0, (p - 0.86) / 0.12)));
      if (text.current) {
        const a = p < 0.3 ? Math.max(0, p / 0.12) : Math.max(0, 1 - (p - 0.3) / 0.18);
        text.current.style.opacity = String(Math.min(1, a));
        text.current.style.transform = `translateY(${(1 - Math.min(1, a)) * 20}px)`;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div ref={wrap} className="ball-strike" aria-hidden>
      <div className="ball-strike-stick">
        <p ref={text} className="ball-strike-text">¡Atenti, viene la pelota!</p>
        <div ref={lines} className="ball-strike-lines" />
        <div ref={shock} className="ball-strike-shock" />
        <div ref={ball} className="ball-strike-ball"><Ball /></div>
        <div ref={veil} className="ball-strike-veil" />
      </div>
      <div className="ball-strike-static"><div className="h-24 w-24"><Ball /></div></div>
    </div>
  );
}
