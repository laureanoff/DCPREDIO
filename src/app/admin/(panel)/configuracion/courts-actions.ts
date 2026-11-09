"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../reservas/actions";

const idSchema = z.string().uuid();
const nameSchema = z.string().trim().min(1, "Poné un nombre para la cancha.").max(60, "El nombre es muy largo.");

function refresh() {
  updateTag("venue"); // la web pública toma el cambio de inmediato
  revalidatePath("/admin", "layout");
}

export async function addCourt(rawName: string): Promise<ActionResult> {
  await requireAdmin();
  const name = nameSchema.safeParse(rawName);
  if (!name.success) return { ok: false, error: name.error.issues[0].message };
  const supabase = await createClient();
  const { data: last } = await supabase.from("courts").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("courts").insert({ name: name.data, sort_order: (last?.sort_order ?? 0) + 1 });
  if (error) {
    console.error("[canchas] insert", error.code, error.message);
    return { ok: false, error: "No se pudo agregar la cancha." };
  }
  refresh();
  return { ok: true, message: "Cancha agregada. Ya se puede reservar en la web." };
}

export async function renameCourt(id: string, rawName: string): Promise<ActionResult> {
  await requireAdmin();
  const name = nameSchema.safeParse(rawName);
  if (!idSchema.safeParse(id).success || !name.success) return { ok: false, error: name.success ? "Cancha inválida." : name.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("courts").update({ name: name.data }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo guardar el nombre." };
  refresh();
  return { ok: true, message: "Nombre guardado." };
}

/** Activa o desactiva una cancha. No se puede dejar el predio sin canchas ni desactivar una con turnos por venir. */
export async function setCourtActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Cancha inválida." };
  const supabase = await createClient();

  if (!active) {
    const { count: activeCount } = await supabase.from("courts").select("id", { count: "exact", head: true }).eq("is_active", true);
    if ((activeCount ?? 0) <= 1) return { ok: false, error: "Tiene que quedar al menos una cancha activa." };
    const { count: upcoming } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("court_id", id)
      .in("status", ["pending", "confirmed"])
      .gt("end_at", new Date().toISOString());
    if ((upcoming ?? 0) > 0) {
      return { ok: false, error: `Esa cancha tiene ${upcoming} ${upcoming === 1 ? "reserva por venir" : "reservas por venir"}. Cancelalas o reprogramalas primero.` };
    }
  }

  const { data, error } = await supabase.from("courts").update({ is_active: active }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo actualizar la cancha." };
  refresh();
  return { ok: true, message: active ? "Cancha activada." : "Cancha desactivada: ya no se puede reservar." };
}
