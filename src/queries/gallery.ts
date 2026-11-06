import { cacheLife, cacheTag } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";

export type GalleryMedia =
  | { id: string; type: "video"; src: string; poster: string | null; title: string }
  | { id: string; type: "image"; src: string; title: string };

/** Galería pública (solo lo activo), en el orden definido en el panel. Se refresca sola y al guardar cambios. */
export async function getPublicGallery(): Promise<GalleryMedia[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("gallery");

  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("gallery_items")
    .select("id, kind, url, poster_url, title")
    .order("sort_order")
    .order("created_at");
  if (error) {
    console.error("[gallery]", error.message);
    return [];
  }
  return (data ?? []).map((g) =>
    g.kind === "video"
      ? { id: g.id, type: "video" as const, src: g.url, poster: g.poster_url, title: g.title }
      : { id: g.id, type: "image" as const, src: g.url, title: g.title },
  );
}
