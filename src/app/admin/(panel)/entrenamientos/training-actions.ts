"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../reservas/actions";

const idSchema = z.string().uuid();
function refresh() {
  updateTag("trainings"); // la web pública toma el cambio de inmediato
  revalidatePath("/admin", "layout");
}

const actSchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre para la actividad.").max(80),
  description: z.string().trim().max(400),
  location: z.string().trim().max(60),
  isActive: z.boolean(),
});

export async function addActivity(raw: z.input<typeof actSchema>): Promise<ActionResult> {
  await requireAdmin();
  const p = actSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const supabase = await createClient();
  const { data: last } = await supabase.from("training_activities").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("training_activities").insert({ name: p.data.name, description: p.data.description || null, location: p.data.location || null, is_active: p.data.isActive, sort_order: (last?.sort_order ?? 0) + 1 });
  if (error) {
    console.error("[entrenamientos] actividad", error.code, error.message);
    return { ok: false, error: "No se pudo agregar la actividad." };
  }
  refresh();
  return { ok: true, message: "Actividad agregada." };
}

export async function updateActivity(id: string, raw: z.input<typeof actSchema>): Promise<ActionResult> {
  await requireAdmin();
  const p = actSchema.safeParse(raw);
  if (!idSchema.safeParse(id).success || !p.success) return { ok: false, error: p.success ? "Actividad inválida." : p.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("training_activities").update({ name: p.data.name, description: p.data.description || null, location: p.data.location || null, is_active: p.data.isActive }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo guardar la actividad." };
  refresh();
  return { ok: true, message: "Actividad guardada." };
}

/** Borra la actividad y todos sus packs. Las inscripciones existentes conservan lo que eligieron. */
export async function deleteActivity(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Actividad inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from("training_activities").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo borrar la actividad." };
  refresh();
  return { ok: true, message: "Actividad borrada." };
}

const price = z.number().min(0, "El precio no puede ser negativo.").max(100_000_000).nullable();
const packSchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre para el pack.").max(80),
  description: z.string().trim().max(400),
  daysPerWeek: z.number().int().min(1, "Los días por semana van de 1 a 7.").max(7, "Los días por semana van de 1 a 7."),
  isActive: z.boolean(),
  prices: z.object({ per_class: price, monthly: price, quarterly: price }),
});
type PackInput = z.input<typeof packSchema>;

async function savePrices(packId: string, prices: z.infer<typeof packSchema>["prices"]): Promise<boolean> {
  const supabase = await createClient();
  const set = Object.entries(prices).filter(([, v]) => v !== null) as [string, number][];
  const unset = Object.entries(prices).filter(([, v]) => v === null).map(([k]) => k);
  if (set.length) {
    const { error } = await supabase.from("training_pack_prices").upsert(set.map(([billing, p]) => ({ pack_id: packId, billing, price: p })), { onConflict: "pack_id,billing" });
    if (error) return false;
  }
  if (unset.length) {
    const { error } = await supabase.from("training_pack_prices").delete().eq("pack_id", packId).in("billing", unset);
    if (error) return false;
  }
  return true;
}

function hasPrice(p: z.infer<typeof packSchema>["prices"]) {
  return Object.values(p).some((v) => v !== null);
}

export async function addPack(activityId: string, raw: PackInput): Promise<ActionResult> {
  await requireAdmin();
  const p = packSchema.safeParse(raw);
  if (!idSchema.safeParse(activityId).success || !p.success) return { ok: false, error: p.success ? "Actividad inválida." : p.error.issues[0].message };
  if (!hasPrice(p.data.prices)) return { ok: false, error: "Cargá al menos un precio (por clase, mensual o trimestral)." };
  const supabase = await createClient();
  const { data: last } = await supabase.from("training_packs").select("sort_order").eq("activity_id", activityId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("training_packs")
    .insert({ activity_id: activityId, name: p.data.name, description: p.data.description || null, days_per_week: p.data.daysPerWeek, is_active: p.data.isActive, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[entrenamientos] pack", error?.code, error?.message);
    return { ok: false, error: "No se pudo agregar el pack." };
  }
  if (!(await savePrices(data.id, p.data.prices))) return { ok: false, error: "El pack se creó pero no se pudieron guardar los precios. Editalo y guardá de nuevo." };
  refresh();
  return { ok: true, message: "Pack agregado." };
}

export async function updatePack(id: string, raw: PackInput): Promise<ActionResult> {
  await requireAdmin();
  const p = packSchema.safeParse(raw);
  if (!idSchema.safeParse(id).success || !p.success) return { ok: false, error: p.success ? "Pack inválido." : p.error.issues[0].message };
  if (!hasPrice(p.data.prices)) return { ok: false, error: "Cargá al menos un precio (por clase, mensual o trimestral)." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_packs")
    .update({ name: p.data.name, description: p.data.description || null, days_per_week: p.data.daysPerWeek, is_active: p.data.isActive })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo guardar el pack." };
  if (!(await savePrices(id, p.data.prices))) return { ok: false, error: "No se pudieron guardar los precios." };
  refresh();
  return { ok: true, message: "Pack guardado. Ya se ve en la web." };
}

export async function deletePack(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Pack inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("training_packs").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo borrar el pack." };
  refresh();
  return { ok: true, message: "Pack borrado." };
}

const coachSchema = z.object({
  name: z.string().trim().max(80),
  title: z.string().trim().max(120),
  bio: z.string().trim().max(500),
  story: z.string().trim().max(3000),
  show: z.boolean(),
});

export async function saveCoach(raw: z.input<typeof coachSchema>): Promise<ActionResult> {
  await requireAdmin();
  const p = coachSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  if (p.data.show && !p.data.name) return { ok: false, error: "Poné el nombre del profe o desmarcá «Mostrar»." };
  const supabase = await createClient();
  const { error } = await supabase.from("training_settings").update({ coach_name: p.data.name, coach_title: p.data.title, coach_bio: p.data.bio, coach_story: p.data.story, show_coach: p.data.show, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) {
    console.error("[entrenamientos] profe", error.code, error.message);
    return { ok: false, error: "No se pudo guardar." };
  }
  refresh();
  return { ok: true, message: "Datos del profe guardados." };
}

const sesSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Poné la hora de inicio."),
  end: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")),
  title: z.string().trim().min(1, "Poné qué entrenamiento es.").max(80),
  details: z.string().trim().max(500),
  isActive: z.boolean(),
});

export async function saveSession(id: string | null, raw: z.input<typeof sesSchema>): Promise<ActionResult> {
  await requireStaff();
  const p = sesSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  if (p.data.end && p.data.end <= p.data.start) return { ok: false, error: "La hora de fin tiene que ser posterior a la de inicio." };
  if (id !== null && !idSchema.safeParse(id).success) return { ok: false, error: "Horario inválido." };
  const row = { weekday: p.data.weekday, start_time: p.data.start, end_time: p.data.end || null, title: p.data.title, details: p.data.details || null, is_active: p.data.isActive };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("training_sessions").update(row).eq("id", id) : await supabase.from("training_sessions").insert(row);
  if (error) {
    console.error("[entrenamientos] horario", error.code, error.message);
    return { ok: false, error: "No se pudo guardar el horario." };
  }
  refresh();
  return { ok: true, message: id ? "Horario actualizado." : "Horario agregado." };
}

export async function deleteSession(id: string): Promise<ActionResult> {
  await requireStaff();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Horario inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("training_sessions").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo borrar el horario." };
  refresh();
  return { ok: true, message: "Horario borrado." };
}

const photoSchema = z.object({
  path: z.string().regex(/^coach-[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i, "Archivo inválido.").nullable(),
  zoom: z.number().min(1).max(3),
  x: z.number().int().min(0).max(100),
  y: z.number().int().min(0).max(100),
});

/** Guarda la foto del profe (ya subida por el navegador al almacenamiento) y cómo se ubica. path=null mantiene la foto actual. */
export async function saveCoachPhoto(raw: z.input<typeof photoSchema>): Promise<ActionResult> {
  await requireAdmin();
  const p = photoSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const supabase = await createClient();
  const patch: { coach_photo_zoom: number; coach_photo_x: number; coach_photo_y: number; updated_at: string; coach_photo_url?: string; coach_photo_path?: string } = {
    coach_photo_zoom: p.data.zoom, coach_photo_x: p.data.x, coach_photo_y: p.data.y, updated_at: new Date().toISOString(),
  };
  let oldPath: string | null = null;
  if (p.data.path) {
    const { data: cur } = await supabase.from("training_settings").select("coach_photo_path").eq("id", true).maybeSingle();
    oldPath = cur?.coach_photo_path ?? null;
    patch.coach_photo_path = p.data.path;
    patch.coach_photo_url = supabase.storage.from("gallery").getPublicUrl(p.data.path).data.publicUrl;
  }
  const { error } = await supabase.from("training_settings").update(patch).eq("id", true);
  if (error) {
    console.error("[entrenamientos] foto profe", error.code, error.message);
    return { ok: false, error: "No se pudo guardar la foto." };
  }
  if (oldPath && oldPath !== p.data.path) await supabase.storage.from("gallery").remove([oldPath]);
  refresh();
  return { ok: true, message: "Foto guardada." };
}

/** Vuelve a la foto por defecto. */
export async function removeCoachPhoto(): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: cur } = await supabase.from("training_settings").select("coach_photo_path").eq("id", true).maybeSingle();
  const { error } = await supabase.from("training_settings").update({ coach_photo_url: null, coach_photo_path: null, coach_photo_zoom: 1, coach_photo_x: 50, coach_photo_y: 50 }).eq("id", true);
  if (error) return { ok: false, error: "No se pudo quitar la foto." };
  if (cur?.coach_photo_path) await supabase.storage.from("gallery").remove([cur.coach_photo_path]);
  refresh();
  return { ok: true, message: "Se volvió a la foto por defecto." };
}
