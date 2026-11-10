"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Phase = "idle" | "playing" | "revealing" | "done";

// Duración de la escena (ms): carrera 1.0 s, remate 1.25 s, gol 1.95 s, festejo hasta ~3.1 s.
const REVEAL_AT = 3100;
const DONE_AT = 3700;

const CONFETTI = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2 + (i % 3) * 0.17;
  const r = 70 + (i % 5) * 26;
  return {
    dx: Math.round(Math.cos(a) * r),
    dy: Math.round(Math.sin(a) * r * 0.8 - 30),
    rot: (i * 97) % 360,
    c: ["#b6d61a", "#ffffff", "#98b30f", "#f5f5f5"][i % 4],
    w: 5 + (i % 3) * 2,
  };
});

/** Escena de gol (SVG + CSS, sin imágenes): un jugador patea, la pelota entra y recién entonces aparece el calendario. */
export function GoalReveal({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  function finish() {
    clear();
    setPhase("revealing");
    timers.current.push(window.setTimeout(() => setPhase("done"), 550));
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      timers.current.push(window.setTimeout(() => setPhase("done"), 0));
      return clear;
    }
    const el = root.current;
    const play = () => {
      setPhase("playing");
      timers.current.push(window.setTimeout(() => setPhase("revealing"), REVEAL_AT));
      timers.current.push(window.setTimeout(() => setPhase("done"), DONE_AT));
    };
    if (!el || !("IntersectionObserver" in window)) {
      timers.current.push(window.setTimeout(play, 0));
      return clear;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          play();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clear();
    };
  }, []);

  const showStage = phase !== "done";
  return (
    <div ref={root} className={cn("relative", showStage && "min-h-[30rem] sm:min-h-[34rem]")}>
      <div
        className={cn(phase === "done" && "goal-content-in", phase === "revealing" && "goal-content-in", phase === "idle" || phase === "playing" ? "pointer-events-none opacity-0" : "")}
        inert={phase === "idle" || phase === "playing"}
        aria-hidden={phase === "idle" || phase === "playing" ? true : undefined}
      >
        {children}
      </div>

      {showStage && (
        <div
          className={cn("goal-stage absolute inset-0 overflow-hidden rounded-3xl border border-border", phase === "playing" && "goal-play", phase === "revealing" && "goal-play goal-out")}
          role="img"
          aria-label="Animación: un jugador patea al arco y hace gol. Después aparece el calendario de reservas."
        >
          <svg viewBox="0 0 400 460" preserveAspectRatio="xMidYMid slice" className="goal-shake h-full w-full" aria-hidden>
            <defs>
              <linearGradient id="gr-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0c1606" />
                <stop offset="1" stopColor="#14230a" />
              </linearGradient>
              <radialGradient id="gr-flash" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="0.45" stopColor="#d6ff3a" stopOpacity="0.55" />
                <stop offset="1" stopColor="#b6d61a" stopOpacity="0" />
              </radialGradient>
              <clipPath id="gr-mouth"><rect x="112" y="72" width="176" height="80" /></clipPath>
            </defs>

            {/* Césped en franjas con perspectiva */}
            <rect width="400" height="460" fill="url(#gr-sky)" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <rect key={i} x="0" y={150 + i * 46} width="400" height="23" fill="#b6d61a" opacity={i % 2 ? 0.06 : 0.025} />
            ))}
            {/* Líneas: área grande, área chica y punto penal */}
            <g fill="none" stroke="#e8f5b0" strokeOpacity="0.5" strokeWidth="2.5">
              <path d="M60 456 L92 152 H308 L340 456" />
              <path d="M138 152 L128 214 H272 L262 152" />
              <path d="M150 214 Q200 252 250 214" />
            </g>
            <circle cx="200" cy="318" r="3.2" fill="#e8f5b0" fillOpacity="0.7" />

            {/* Arco con red */}
            <g>
              <g clipPath="url(#gr-mouth)">
                <g className="goal-net" stroke="#ffffff" strokeOpacity="0.38" strokeWidth="1.1" fill="none">
                  {Array.from({ length: 19 }, (_, i) => <path key={`v${i}`} d={`M${112 + i * 10} 72 V152`} />)}
                  {Array.from({ length: 9 }, (_, i) => <path key={`h${i}`} d={`M112 ${72 + i * 10} H288`} />)}
                </g>
              </g>
              <path d="M112 152 V72 H288 V152" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M112 72 L98 60 H302 L288 72" fill="none" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="2.5" />
            </g>
            <circle className="goal-flash" cx="250" cy="112" r="95" fill="url(#gr-flash)" />

            {/* Pelota: trayectoria en dos capas (x lineal, y con arco) */}
            <g className="goal-ball-x">
              <g className="goal-ball-y">
                <g className="goal-ball-spin">
                  <circle cx="180" cy="382" r="10.5" fill="#ffffff" stroke="#0a0a0a" strokeWidth="1.4" />
                  <path d="M180 376.5 l5.2 3.8 -2 6.1 h-6.4 l-2 -6.1 z" fill="#0a0a0a" />
                  <path d="M180 376.5 V372 M185.2 380.3 l4.3 -1.4 M183.2 386.4 l2.6 3.6 M176.8 386.4 l-2.6 3.6 M174.8 380.3 l-4.3 -1.4" stroke="#0a0a0a" strokeWidth="1.2" strokeLinecap="round" />
                </g>
              </g>
            </g>
            <ellipse cx="180" cy="394" rx="12" ry="3" fill="#000" opacity="0.35" className="goal-ball-shadow" />

            {/* Jugador (mirando a la derecha). Pie de apoyo en y = 0 del grupo. */}
            <g transform="translate(130 394)">
              <g className="goal-player">
                <ellipse cx="0" cy="2" rx="26" ry="4.5" fill="#000" opacity="0.4" />
                <g className="goal-body">
                  {/* pierna de apoyo */}
                  <g transform="translate(-3 -52)">
                    <g className="goal-leg-a">
                      <rect x="-5.5" y="0" width="11" height="27" rx="5" fill="#e9b88a" />
                      <g transform="translate(0 26)">
                        <g className="goal-shin-a">
                          <rect x="-5" y="0" width="10" height="20" rx="4" fill="#e9b88a" />
                          <rect x="-5.5" y="12" width="11" height="14" rx="3" fill="#f5f5f5" />
                          <path d="M-6 24 h16 q4 0 4 5 v1.5 h-20 z" fill="#0a0a0a" />
                        </g>
                      </g>
                    </g>
                  </g>
                  {/* brazo trasero */}
                  <g transform="translate(-6 -98)"><g className="goal-arm-b"><rect x="-4" y="0" width="8" height="30" rx="4" fill="#d6a275" /></g></g>
                  {/* pierna que patea */}
                  <g transform="translate(-3 -52)">
                    <g className="goal-leg-k">
                      <rect x="-5.5" y="0" width="11" height="27" rx="5" fill="#f2c9a0" />
                      <g transform="translate(0 26)">
                        <g className="goal-shin-k">
                          <rect x="-5" y="0" width="10" height="20" rx="4" fill="#f2c9a0" />
                          <rect x="-5.5" y="12" width="11" height="14" rx="3" fill="#f5f5f5" />
                          <path d="M-6 24 h16 q4 0 4 5 v1.5 h-20 z" fill="#0a0a0a" />
                        </g>
                      </g>
                    </g>
                  </g>
                  {/* short, camiseta, cabeza */}
                  <path d="M-13 -62 h22 l2 18 h-27 z" fill="#0a0a0a" />
                  <path d="M-12 -101 q10 -5 22 -1 l4 42 h-27 z" fill="#b6d61a" />
                  <text x="-3" y="-76" textAnchor="middle" fontSize="15" fontWeight="800" fill="#0a0a0a" style={{ fontFamily: "var(--font-display), system-ui" }}>10</text>
                  <rect x="-3" y="-111" width="9" height="12" rx="3" fill="#f2c9a0" />
                  <circle cx="2" cy="-118" r="11.5" fill="#f2c9a0" />
                  <path d="M-9.5 -120 q2 -13 14 -11 q9 2 8 11 q-6 -6 -14 -4 q-5 1 -8 4 z" fill="#2a1a10" />
                  {/* brazo delantero */}
                  <g transform="translate(5 -98)"><g className="goal-arm-f"><rect x="-4" y="0" width="8" height="30" rx="4" fill="#f2c9a0" /></g></g>
                </g>
              </g>
            </g>

            {/* Destello y confeti en el arco */}
            <g transform="translate(250 112)">
              {CONFETTI.map((p, i) => (
                <rect key={i} className="goal-confetti" x={-p.w / 2} y={-p.w / 2} width={p.w} height={p.w * 1.8} rx="1" fill={p.c} style={{ ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px`, ["--rot" as string]: `${p.rot}deg` }} />
              ))}
            </g>
            <text className="goal-text" x="200" y="272" textAnchor="middle" fontSize="60" fontWeight="900" style={{ fontFamily: "var(--font-display), Impact, system-ui" }}>
              ¡GOOOL!
            </text>
          </svg>

          <button
            type="button"
            onClick={finish}
            className="absolute bottom-3 right-3 z-10 rounded-full border border-white/25 bg-black/55 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/75"
          >
            Saltar ▸
          </button>
        </div>
      )}
    </div>
  );
}
