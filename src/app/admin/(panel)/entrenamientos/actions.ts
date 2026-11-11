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

const paySchema = z.object({
  amount: z.number().positive("Ingresá un monto mayor a cero.").max(100_000_000),
  method: z.enum(["cash", "transfer", "other"]),
  concept: z.string().trim().max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida."),
  notes: z.string().trim().max(500),
});

/** Registra un cobro de una inscripción (se cobró en el predio). */
export async function addTrainingPayment(enrollmentId: string, raw: z.input<typeof paySchema>): Promise<ActionResult> {
  await requireStaff();
  const p = paySchema.safeParse(raw);
  if (!idSchema.safeParse(enrollmentId).success || !p.success) return { ok: false, error: p.success ? "Inscripción inválida." : p.error.issues[0].message };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Cordoba" }).format(new Date());
  if (p.data.date > today) return { ok: false, error: "La fecha del cobro no puede ser futura." };
  const supabase = await createClient();
  const { error } = await supabase.from("training_payments").insert({
    enrollment_id: enrollmentId,
    amount: p.data.amount,
    method: p.data.method,
    concept: p.data.concept || null,
    notes: p.data.notes || null,
    paid_at: p.data.date === today ? new Date().toISOString() : `${p.data.date}T12:00:00-03:00`,
  });
  if (error) {
    console.error("[entrenamientos] cobro", error.code, error.message);
    return { ok: false, error: "No se pudo registrar el cobro." };
  }
  refresh();
  return { ok: true, message: "Cobro registrado." };
}

export async function voidTrainingPayment(id: string, reason: string): Promise<ActionResult> {
  await requireStaff();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Cobro inválido." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_payments")
    .update({ is_voided: true, voided_at: new Date().toISOString(), void_reason: reason.trim().slice(0, 300) || null })
    .eq("id", id)
    .eq("is_voided", false)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo anular el cobro." };
  refresh();
  return { ok: true, message: "Cobro anulado." };
}
