import { cn } from "@/lib/utils";

type Kind = "dumbbell" | "ball" | "goal" | "kettlebell";

const SHAPES: Record<Kind, { vb: string; body: React.ReactNode }> = {
  dumbbell: {
    vb: "0 0 120 48",
    body: (<><rect x="4" y="12" width="10" height="24" rx="3" /><rect x="16" y="6" width="12" height="36" rx="3" /><path d="M28 24H92" /><rect x="92" y="6" width="12" height="36" rx="3" /><rect x="106" y="12" width="10" height="24" rx="3" /></>),
  },
  ball: {
    vb: "0 0 64 64",
    body: (<><circle cx="32" cy="32" r="28" /><path d="M32 20 43 28 39 41H25L21 28Z" /><path d="M32 20V5M43 28 57 23M39 41 47 54M25 41 17 54M21 28 7 23" /></>),
  },
  goal: {
    vb: "0 0 120 80",
    body: (<><path d="M8 74V12H112V74" /><path strokeWidth="1.5" d="M24 12V74M40 12V74M56 12V74M72 12V74M88 12V74M8 30H112M8 48H112M8 66H112" /></>),
  },
  kettlebell: {
    vb: "0 0 100 100",
    body: (<><path d="M33 40C28 8 72 8 67 40" /><circle cx="50" cy="64" r="28" /><path d="M36 64H64" /></>),
  },
};

/** Ilustración de línea (pesa, pelota, arco, pesa rusa) que flota despacio. Posición y tamaño por className/style. */
export function Deco({ kind, className, rot = 0, delay = 0 }: { kind: Kind; className?: string; rot?: number; delay?: number }) {
  const s = SHAPES[kind];
  return (
    <svg
      viewBox={s.vb}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("deco", className)}
      style={{ "--r": `${rot}deg`, animationDelay: `${delay}s` } as React.CSSProperties}
    >
      {s.body}
    </svg>
  );
}

/** Conjunto repartido por los bordes de una sección (el contenedor tiene que ser "relative"). */
export function DecoSet({ variant = "page" }: { variant?: "page" | "hero" }) {
  if (variant === "hero") {
    return (
      <div className="tr-cuts" aria-hidden>
        <Deco kind="dumbbell" rot={-14} className="w-28" delay={0} />
        <Deco kind="ball" rot={10} className="w-14" delay={1.2} />
        <Deco kind="goal" rot={4} className="w-24" delay={0.6} />
        <Deco kind="kettlebell" rot={-8} className="w-14" delay={1.8} />
      </div>
    );
  }
  return (
    <div className="deco-set" aria-hidden>
      <Deco kind="dumbbell" rot={-18} className="w-32" delay={0} />
      <Deco kind="ball" rot={12} className="w-16" delay={1.4} />
      <Deco kind="goal" rot={-5} className="w-36" delay={0.8} />
      <Deco kind="kettlebell" rot={10} className="w-20" delay={2.2} />
      <Deco kind="ball" rot={-20} className="w-12" delay={3} />
    </div>
  );
}
