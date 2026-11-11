import { cn } from "@/lib/utils";

/**
 * Persona recortada que entra con fundido + desenfoque y después flota despacio.
 * El contenedor padre tiene que ser "relative"; se posiciona con className (ancho, right/left, bottom…).
 */
export function CutOut({
  src, alt = "", className, delay = 0, from = 40, float = true,
}: { src: string; alt?: string; className?: string; delay?: number; from?: number; float?: boolean }) {
  return (
    <div
      aria-hidden={alt === "" ? true : undefined}
      className={cn("cutout", className)}
      style={{ "--cd": `${delay}s`, "--cx": `${from}px` } as React.CSSProperties}
    >
      <div className={cn("cutout-in", float && "cutout-float")} style={{ "--cd": `${delay}s`, "--cx": `${from}px` } as React.CSSProperties}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      </div>
    </div>
  );
}
