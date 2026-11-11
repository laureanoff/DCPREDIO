import { cn } from "@/lib/utils";

export type CoachPhotoData = { url: string; zoom: number; x: number; y: number } | null;

/** Retrato del profe. Con foto subida se recorta y ubica según lo configurado en el panel; sin foto usa la imagen por defecto. */
export function CoachPhoto({ photo, alt, className }: { photo: CoachPhotoData; alt: string; className?: string }) {
  return (
    <div className={cn("coach-photo flex items-end justify-center overflow-hidden rounded-3xl border border-white/10", className)}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt={alt} className="h-full w-full object-cover" style={{ objectPosition: `${photo.x}% ${photo.y}%`, transform: `scale(${photo.zoom})`, transformOrigin: `${photo.x}% ${photo.y}%` }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/trainings/diego.webp" alt={alt} className="h-full w-full object-contain object-bottom" />
      )}
    </div>
  );
}
