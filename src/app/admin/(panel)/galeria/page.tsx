import { Suspense } from "react";
import { PanelLoading } from "@/components/ui/Loaders";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GalleryList } from "./gallery-list";
import { GalleryUploader } from "./uploader";

export const metadata: Metadata = { title: "Galería" };

async function Gallery() {
  await connection();
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("gallery_items").select("*").eq("placement", "home").order("sort_order").order("created_at");
  if (error) throw new Error(`No se pudo leer la galería: ${error.message}`);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Galería</h1>
        <p className="text-sm text-muted">Videos y fotos de la galería del inicio (los de Entrenamientos se cargan en Entrenamientos → Fotos y videos). Lo que subas aparece solo, en el orden de esta lista, y el carrusel se mueve despacio.</p>
      </div>
      <GalleryUploader />
      <GalleryList
        items={(data ?? []).map((g) => ({
          id: g.id, kind: g.kind, url: g.url, posterUrl: g.poster_url, title: g.title, isActive: g.is_active,
        }))}
      />
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<PanelLoading />}>
      <Gallery />
    </Suspense>
  );
}
