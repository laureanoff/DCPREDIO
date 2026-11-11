"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../reservas/actions";

const idSchema = z.string().uuid();
const refresh = () => revalidatePath("/admin", "layout");

const STATUS_MSG: Record<string, string> = { active: "Inscripción aceptada.", paused: "Inscripción en pausa.", cancelled: "Inscripción dada de baja.", pending: "Inscripción vuelta a pendiente." };

export async function setEnrollmentStatus(id: string, status: "pending" | "active" | "paused" | "cancelled"): Promise<ActionResult> {
  await requireStaff();
  if (!idSchema.safeParse(id).success || !(status in STATUS_MSG)) return { ok: false, error: "Datos inválidos." };
  const supabase = await createClient();
  const patch: { status: string; start_date?: string } = { status };
  if (status === "active") {
    const { data: cur } = await supabase.from("training_enrollments").select("start_date").eq("id", id).maybeSingle();
    if (!cur?.start_date) patch.start_date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Cordoba" }).format(new Date());
  }
  const { data, error } = await supabase.from("training_enrollments").update(patch).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo cambiar el estado." };
  refresh();
  return { ok: true, message: STATUS_MSG[status] };
}

export async function saveEnrollmentNotes(id: string, notes: string): Promise<ActionResult> {
  await requireStaff();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Inscripción inválida." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("training_enrollments").update({ staff_notes: notes.trim().slice(0, 500) || null }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo guardar la nota." };
  refresh();
  return { ok: true, message: "Nota guardada." };
}

/** Borra la inscripción (y la ficha del alumno si no le quedan otras). Solo administrador. */
export async function deleteEnrollment(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Inscripción inválida." };
  const supabase = await createClient();
  const { data: e } = await supabase.from("training_enrollments").select("student_id").eq("id", id).maybeSingle();
  if (!e) return { ok: false, error: "La inscripción no existe." };
  const { error } = await supabase.from("training_enrollments").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo borrar." };
  const { count } = await supabase.from("training_enrollments").select("id", { count: "exact", head: true }).eq("student_id", e.student_id);
  if (!count) await supabase.from("training_students").delete().eq("id", e.student_id);
  refresh();
  return { ok: true, message: "Inscripción borrada." };
}
