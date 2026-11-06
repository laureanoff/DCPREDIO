"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../reservas/actions";

const BUCKET = "gallery";
const idSchema = z.string().uuid();

function refresh() {
  updateTag("gallery"); // la web pública toma los cambios de inmediato
  revalidatePath("/admin/galeria");
}

// Los nombres de archivo los genera el panel (uuid + extensión permitida); se valida igual en el servidor.
const pathSchema = z.string().regex(/^[0-9a-f-]{36}\.(mp4|webm|mov|jpg|jpeg|png|webp)$/i, "Archivo inválido.");
const posterPathSchema = z.string().regex(/^[0-9a-f-]{36}-poster\.jpg$/i, "Portada inválida.");

const addSchema = z.object({
  kind: z.enum(["video", "image"]),
  path: pathSchema,
  posterPath: posterPathSchema.nullable(),
  title: z.string().trim().max(120),
});

/** Registra en la galería un archivo que el navegador ya subió al almacenamiento. */
export async function addGalleryItem(raw: z.input<typeof addSchema>): Promise<ActionResult> {
  const staff = await requireAdmin();
  const parsed = addSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const v = parsed.data;

  const supabase = await createClient();
  const publicUrl = (p: string) => supabase.storage.from(BUCKET).getPublicUrl(p).data.publicUrl;

  const { data: last } = await supabase.from("gallery_items").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("gallery_items").insert({
    kind: v.kind,
    url: publicUrl(v.path),
    storage_path: v.path,
    poster_url: v.posterPath ? publicUrl(v.posterPath) : null,
    poster_storage_path: v.posterPath,
    title: v.title,
    sort_order: (last?.sort_order ?? 0) + 1,
    created_by: staff.userId,
  });
  if (error) {
    console.error("[galeria] insert", error.code, error.message);
    return { ok: false, error: "No se pudo guardar en la galería." };
  }
  refresh();
  return { ok: true, message: "Agregado a la galería. Ya se ve en la web." };
}

export async function setGalleryActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Elemento inválido." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("gallery_items").update({ is_active: active }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo actualizar." };
  refresh();
  return { ok: true, message: active ? "Visible en la web." : "Oculto de la web." };
}

export async function renameGalleryItem(id: string, title: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Elemento inválido." };
  const clean = title.trim().slice(0, 120);
  const supabase = await createClient();
  const { data, error } = await supabase.from("gallery_items").update({ title: clean }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo guardar el título." };
  refresh();
  return { ok: true, message: "Título guardado." };
}

/** Mueve un elemento una posición hacia arriba (-1) o abajo (+1) intercambiando el orden con su vecino. */
export async function moveGalleryItem(id: string, dir: -1 | 1): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Elemento inválido." };
  const supabase = await createClient();
  const { data: all, error } = await supabase.from("gallery_items").select("id").order("sort_order").order("created_at");
  if (error || !all) return { ok: false, error: "No se pudo leer la galería." };
  const ids = all.map((r) => r.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true, message: "Sin cambios." };
  [ids[i], ids[j]] = [ids[j], ids[i]];
  for (let n = 0; n < ids.length; n++) {
    const { error: e } = await supabase.from("gallery_items").update({ sort_order: n + 1 }).eq("id", ids[n]);
    if (e) return { ok: false, error: "No se pudo reordenar." };
  }
  refresh();
  return { ok: true, message: "Orden actualizado." };
}

export async function deleteGalleryItem(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Elemento inválido." };
  const supabase = await createClient();
  const { data: item } = await supabase.from("gallery_items").select("storage_path, poster_storage_path").eq("id", id).maybeSingle();
  if (!item) return { ok: false, error: "El elemento no existe." };

  const { error } = await supabase.from("gallery_items").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };

  // Borra también los archivos del almacenamiento (los de ejemplo del sitio no tienen ruta y se conservan).
  const paths = [item.storage_path, item.poster_storage_path].filter((p): p is string => !!p);
  if (paths.length) {
    const { error: sErr } = await supabase.storage.from(BUCKET).remove(paths);
    if (sErr) console.error("[galeria] storage remove", sErr.message);
  }
  refresh();
  return { ok: true, message: "Eliminado de la galería." };
}
