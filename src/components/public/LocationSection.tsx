import { MapPin } from "lucide-react";
import { CAROUSEL_MEDIA } from "@/config/media";
import type { PublicVenue } from "@/queries/venue";
import { MapLoader } from "./MapLoader";
import { MediaCarousel } from "./MediaCarousel";

/** Carrusel de video arriba y mapa 3D abajo (la dirección sale de Configuración en el panel). */
export function LocationSection({ venue }: { venue: PublicVenue }) {
  const hasMap = Boolean(venue.address);
  if (!hasMap && CAROUSEL_MEDIA.length === 0) return null;

  const q = encodeURIComponent(venue.address ?? "");
  return (
    <section id="ubicacion" className="scroll-mt-20 px-5 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {CAROUSEL_MEDIA.length > 0 && <MediaCarousel items={CAROUSEL_MEDIA} />}

        {hasMap && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase sm:text-4xl">
                Dónde <span className="text-lime-ink">estamos</span>
              </h2>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${q}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-lime px-5 text-sm font-semibold text-black transition hover:bg-lime-dark"
              >
                <MapPin size={16} /> Cómo llegar
              </a>
            </div>
            <p className="-mt-2 text-sm text-muted">{venue.address}</p>
            <div className="h-80 overflow-hidden rounded-3xl border border-border bg-surface sm:h-[28rem]">
              <MapLoader
                lat={venue.latitude}
                lng={venue.longitude}
                title={venue.address ?? venue.name}
                fallbackSrc={`https://www.google.com/maps?q=${q}&z=16&output=embed`}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
