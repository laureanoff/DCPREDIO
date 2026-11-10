import { cn } from "@/lib/utils";

/** Pelota que rebota con sombra: indicador de carga con tema de fútbol. */
export function BallLoader({ label = "Cargando…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center justify-center gap-3 py-6 text-muted", className)}>
      <div className="ball-loader" aria-hidden>
        <span className="ball-loader-ball" />
        <span className="ball-loader-shadow" />
      </div>
      <p className="ball-loader-text text-sm font-semibold uppercase tracking-[0.25em]">{label}</p>
    </div>
  );
}

/** Bloque de carga con brillo que lo recorre. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

/** Marco de carga de una pantalla del panel: título + tarjetas con brillo y la pelota. */
export function PanelLoading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div aria-busy className="loading-fade mx-auto flex max-w-5xl flex-col gap-4">
      <Skeleton className="h-9 w-56 rounded-xl" />
      <BallLoader label={label} className="py-3" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}
