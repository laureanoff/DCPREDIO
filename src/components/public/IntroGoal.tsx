"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Línea de tiempo (ms): luces 0–0.9 s · carrera 0.5–1.75 s · remate 2.06 s · gol 3.26 s · texto 3.4 s · disolvencia 4.9 s.
const REVEAL_AT = 4900;
const DONE_AT = 5900;

const SPARKS = Array.from({ length: 26 }, (_, i) => {
  const a = (i / 26) * Math.PI * 2 + (i % 4) * 0.21;
  const r = 90 + (i % 6) * 38;
  return { dx: Math.round(Math.cos(a) * r), dy: Math.round(Math.sin(a) * r * 0.75), s: 2 + (i % 3), c: i % 3 ? "#d8ff3a" : "#ffffff" };
});
const STARS = Array.from({ length: 36 }, (_, i) => ({ x: (i * 211) % 1600, y: 8 + ((i * 97) % 190), r: 0.8 + (i % 3) * 0.5, d: (i % 7) * 0.4 }));
const FLASHES = Array.from({ length: 34 }, (_, i) => ({ x: 40 + ((i * 163) % 1520), y: 300 + ((i * 29) % 24), d: ((i * 37) % 30) / 10 }));

function Floodlight({ x }: { x: number }) {
  return (
    <g className="in-light" style={{ animationDelay: x < 800 ? "0.1s" : "0.4s" }}>
      <rect x={x - 5} y="150" width="10" height="190" fill="#0a0e08" />
      <circle cx={x} cy="120" r="150" fill="url(#in-glow)" />
      {[0, 1, 2].map((c) => [0, 1].map((r) => (
        <rect key={`${c}${r}`} x={x - 36 + c * 25} y={96 + r * 20} width="21" height="15" rx="2" fill="#fffbe6" />
      )))}
      <polygon points={`${x - 30},130 ${x + 30},130 ${x < 800 ? 760 : 1480},900 ${x < 800 ? -120 : 840},900`} fill="url(#in-beam)" className="in-beam" />
    </g>
  );
}

const BODY = "#05080a";
const RIM = { stroke: "#cdee2e", strokeWidth: 0.9, strokeOpacity: 0.85 } as const;

const Leg = ({ cls, shinCls }: { cls: string; shinCls: string }) => (
  <g transform="translate(-3 -52)">
    <g className={cls}>
      <rect x="-5.5" y="0" width="11" height="27" rx="5" fill={BODY} {...RIM} />
      <g transform="translate(0 26)">
        <g className={shinCls}>
          <rect x="-5" y="0" width="10" height="21" rx="4" fill={BODY} {...RIM} />
          <path d="M-6 22 h16 q4 0 4 5 v1.5 h-20 z" fill={BODY} {...RIM} />
        </g>
      </g>
    </g>
  </g>
);

/** Rig del jugador (silueta a contraluz). El origen de cada miembro es su articulación. */
function Player() {
  return (
    <g transform="translate(690 764) scale(2.7)">
      <g className="in-player">
        <ellipse cx="6" cy="2" rx="30" ry="4.5" fill="#000" opacity="0.55" />
        <g className="in-body">
          <Leg cls="in-leg-a" shinCls="in-shin-a" />
          <g transform="translate(-6 -98)"><g className="in-arm-b"><rect x="-4" y="0" width="8" height="30" rx="4" fill={BODY} {...RIM} /></g></g>
          <Leg cls="in-leg-k" shinCls="in-shin-k" />
          <path d="M-13 -62 h22 l2 18 h-27 z" fill={BODY} {...RIM} />
          <path d="M-12 -101 q10 -5 22 -1 l4 42 h-27 z" fill={BODY} {...RIM} />
          <path d="M-12.6 -84 l26 3" stroke="#b6d61a" strokeWidth="2.2" strokeOpacity="0.9" />
          <rect x="-3" y="-111" width="9" height="12" rx="3" fill={BODY} {...RIM} />
          <circle cx="2" cy="-118" r="11.5" fill={BODY} {...RIM} />
          <g transform="translate(5 -98)"><g className="in-arm-f"><rect x="-4" y="0" width="8" height="30" rx="4" fill={BODY} {...RIM} /></g></g>
        </g>
      </g>
    </g>
  );
}

function Ball({ ghost = 0 }: { ghost?: number }) {
  const delay = ghost ? `${2.06 + ghost * 0.04}s` : undefined;
  const style = delay ? { animationDelay: delay } : undefined;
  return (
    <g className="in-ball-x" style={style}>
      <g className="in-ball-y" style={style}>
        {ghost ? (
          <circle className="in-ghost" cx="800" cy="738" r={22 - ghost * 1.2} fill="#eaffb0" style={{ animationDelay: delay, filter: "blur(3px)" }} />
        ) : (
          <g className="in-ball-spin">
            <circle cx="800" cy="738" r="22" fill="#ffffff" />
            <circle cx="800" cy="738" r="22" fill="url(#in-ballshade)" />
            <path d="M800 726 l11 8 -4 13 h-14 l-4 -13 z" fill="#0a0a0a" />
            <path d="M800 726 V716 M811 734 l9 -3 M807 747 l5.5 7.5 M793 747 l-5.5 7.5 M789 734 l-9 -3" stroke="#0a0a0a" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        )}
      </g>
    </g>
  );
}

/** Introducción cinematográfica de pantalla completa: estadio de noche, remate a contraluz, gol y disolvencia al sitio. */
export function IntroGoal() {
  const [phase, setPhase] = useState<"playing" | "revealing" | "done">("playing");

  useEffect(() => {
    const html = document.documentElement;
    if (html.classList.contains("intro-skip")) {
      const t = window.setTimeout(() => setPhase("done"), 0);
      return () => window.clearTimeout(t);
    }
    html.classList.add("intro-lock");
    try { sessionStorage.setItem("dc-intro", "1"); } catch { /* sin storage: se repetirá */ }
    const t1 = window.setTimeout(() => { setPhase("revealing"); }, REVEAL_AT);
    const t1b = window.setTimeout(() => html.classList.add("intro-done"), REVEAL_AT + 250);
    const t2 = window.setTimeout(() => { setPhase("done"); html.classList.remove("intro-lock"); }, DONE_AT);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") skip(); };
    window.addEventListener("keydown", onKey);
    function skip() {
      window.clearTimeout(t1); window.clearTimeout(t1b); window.clearTimeout(t2);
      setPhase("revealing");
      html.classList.add("intro-done");
      window.setTimeout(() => { setPhase("done"); html.classList.remove("intro-lock"); }, 700);
    }
    (window as unknown as { __skipIntro?: () => void }).__skipIntro = skip;
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t1); window.clearTimeout(t1b); window.clearTimeout(t2);
      html.classList.remove("intro-lock");
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={cn("intro-overlay in-play fixed inset-0 z-[100] overflow-hidden bg-black", phase === "revealing" && "in-out")}
      role="img"
      aria-label="Introducción animada: un jugador patea al arco y hace gol. Después aparece el sitio."
    >
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="in-open absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="in-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#010204" /><stop offset="0.7" stopColor="#07110a" /><stop offset="1" stopColor="#12220a" />
          </linearGradient>
          <radialGradient id="in-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fffbe6" stopOpacity="0.95" /><stop offset="0.25" stopColor="#e9f5b0" stopOpacity="0.45" /><stop offset="1" stopColor="#b6d61a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="in-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4ffd0" stopOpacity="0.30" /><stop offset="1" stopColor="#f4ffd0" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="in-ballshade" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.38" />
          </radialGradient>
          <radialGradient id="in-flash" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" /><stop offset="0.35" stopColor="#e4ff5a" stopOpacity="0.7" /><stop offset="1" stopColor="#b6d61a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="in-vig" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.45" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.85" />
          </radialGradient>
          <linearGradient id="in-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#cfe88a" stopOpacity="0" /><stop offset="0.5" stopColor="#cfe88a" stopOpacity="0.2" /><stop offset="1" stopColor="#cfe88a" stopOpacity="0" />
          </linearGradient>
          <filter id="in-grass" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.55 0.035" numOctaves="2" seed="4" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.62  0 0 0 0 0.1  0 0 0 1.25 -0.38" />
          </filter>
          <clipPath id="in-pitch"><polygon points="800,330 -200,900 1800,900" /></clipPath>
          <clipPath id="in-mouth"><rect x="724" y="270" width="152" height="68" /></clipPath>
        </defs>

        <g className="in-shake">
          <g className="in-punch">
            <g className="in-cam">
              {/* Cielo, estrellas y tribunas */}
              <rect width="1600" height="900" fill="url(#in-sky)" />
              {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" className="in-star" style={{ animationDelay: `${s.d}s` }} />)}
              <path d="M0 330 V300 L90 288 L210 296 L330 282 L520 290 L700 276 L900 276 L1080 290 L1270 282 L1400 296 L1520 288 L1600 300 V330 Z" fill="#05080a" />
              <path d="M0 330 V312 L260 304 L700 298 L900 298 L1340 304 L1600 312 V330 Z" fill="#0b130a" />
              {FLASHES.map((f, i) => <circle key={i} cx={f.x} cy={f.y} r="1.8" fill="#fff" className="in-flash-dot" style={{ animationDelay: `${1.2 + f.d}s` }} />)}

              <Floodlight x={250} />
              <Floodlight x={1350} />

              {/* Césped en perspectiva */}
              <polygon points="800,330 -200,900 1800,900" fill="#10240a" />
              <g clipPath="url(#in-pitch)">
                {Array.from({ length: 14 }, (_, i) => {
                  const x0 = -1600 + i * 400;
                  return <polygon key={i} points={`800,330 ${x0},900 ${x0 + 400},900`} fill="#b6d61a" opacity={i % 2 ? 0.1 : 0.02} />;
                })}
                <rect x="-200" y="330" width="2000" height="570" filter="url(#in-grass)" opacity="0.5" style={{ mixBlendMode: "overlay" }} />
              </g>
              {/* Líneas del área y punto penal */}
              <g fill="none" stroke="#f3ffd0" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round">
                <path d="M700 338 L382 560 M900 338 L1218 560 M382 560 H1218" />
                <path d="M760 338 L612 440 M840 338 L988 440 M612 440 H988" strokeOpacity="0.4" />
                <path d="M640 560 Q800 650 960 560" />
              </g>
              <ellipse cx="800" cy="744" rx="9" ry="3.2" fill="#f3ffd0" opacity="0.5" />
              <rect x="0" y="300" width="1600" height="120" fill="url(#in-haze)" />

              {/* Arco al fondo */}
              <g>
                <g clipPath="url(#in-mouth)">
                  <rect x="724" y="270" width="152" height="68" fill="#020403" opacity="0.85" />
                  <g className="in-net" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" fill="none">
                    {Array.from({ length: 16 }, (_, i) => <path key={`v${i}`} d={`M${724 + i * 10} 270 V338`} />)}
                    {Array.from({ length: 8 }, (_, i) => <path key={`h${i}`} d={`M724 ${270 + i * 10} H876`} />)}
                  </g>
                </g>
                <path d="M724 338 V270 H876 V338" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <circle className="in-impact" cx="850" cy="300" r="170" fill="url(#in-flash)" />
              <circle className="in-ring" cx="850" cy="300" r="40" fill="none" stroke="#d8ff3a" strokeWidth="5" />
              {SPARKS.map((p, i) => (
                <circle key={i} className="in-spark" cx="850" cy="300" r={p.s} fill={p.c} style={{ ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px` }} />
              ))}

              {/* Pelota con estela */}
              <ellipse cx="800" cy="760" rx="26" ry="6" fill="#000" opacity="0.5" className="in-ball-shadow" />
              {[5, 4, 3, 2, 1].map((g) => <Ball key={g} ghost={g} />)}
              <Ball />

              <Player />
            </g>
          </g>
        </g>

        <rect width="1600" height="900" fill="url(#in-vig)" />
        <rect className="in-bar-top" x="0" y="0" width="1600" height="84" fill="#000" />
        <rect className="in-bar-bottom" x="0" y="816" width="1600" height="84" fill="#000" />
      </svg>

      <p className="in-gol pointer-events-none absolute inset-x-0 top-[44%] -translate-y-1/2 text-center font-[family-name:var(--font-display)] font-black uppercase leading-none" aria-hidden>
        ¡Gooool!
      </p>

      <button
        type="button"
        onClick={() => (window as unknown as { __skipIntro?: () => void }).__skipIntro?.()}
        className="absolute bottom-6 right-5 z-10 rounded-full border border-white/25 bg-black/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur transition hover:bg-black/75 sm:bottom-8 sm:right-8"
      >
        Saltar ▸
      </button>
    </div>
  );
}
