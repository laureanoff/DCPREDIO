"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
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
