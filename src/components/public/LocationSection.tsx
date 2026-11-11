import { MapPin } from "lucide-react";
import { getPublicGallery } from "@/queries/gallery";
import type { PublicVenue } from "@/queries/venue";
import { MapLoader } from "./MapLoader";
import { MediaGallery } from "./MediaGallery";

/** Galería de video arriba y mapa 3D abajo (la dirección sale de Configuración en el panel). */
export async function LocationSection({ venue }: { venue: PublicVenue }) {
  const media = await getPublicGallery();
  const hasMap = Boolean(venue.address);
  if (!hasMap && media.length === 0) return null;

  const q = encodeURIComponent(venue.address ?? "");
  return (
    <section id="ubicacion" className="scroll-mt-20 px-5 pb-20 pt-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {media.length > 0 && <MediaGallery items={media} />}

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
            <div className="glass rounded-[2rem] p-2"><div className="h-80 overflow-hidden rounded-3xl sm:h-[28rem]">
              <MapLoader
                lat={venue.latitude}
                lng={venue.longitude}
                title={venue.address ?? venue.name}
                fallbackSrc={`https://www.google.com/maps?q=${q}&z=16&output=embed`}
              />
            </div></div>
          </>
        )}
      </div>
    </section>
  );
}
