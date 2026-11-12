"use server";

import { after } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStaff } from "@/services/push";
import { phoneSchema } from "@/validations/booking";

const schema = z.object({
  packId: z.string().uuid(),
  billing: z.enum(["per_class", "monthly", "quarterly"]),
  studentName: z.string().trim().min(2, "Ingresá el nombre y apellido del alumno.").max(100),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá la fecha de nacimiento."),
  guardianName: z.string().trim().min(2, "Ingresá el nombre del responsable.").max(100),
  phone: phoneSchema,
  email: z.string().trim().max(150).email("El email no es válido.").or(z.literal("")),
  emergency: z.string().trim().max(200),
  health: z.string().trim().max(500),
  days: z.array(z.number().int().min(0).max(6)).max(7),
  time: z.string().trim().max(200),
  notes: z.string().trim().max(500),
  website: z.string().max(200).optional(),
});

const ERR: Record<string, string> = {
  DC030: "Esa opción ya no está disponible. Actualizá la página.",
  DC031: "Esa modalidad de pago ya no está disponible para esa opción. Actualizá la página.",
  DC032: "Revisá los datos ingresados.",
  DC033: "Ya tenés varias solicitudes pendientes. Comunicate con el predio.",
  DC034: "Elegí al menos tantos días como incluye la opción.",
};

export type EnrollResult = { ok: true; id: string } | { ok: false; error: string };

export async function enroll(input: unknown): Promise<EnrollResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." };
  const v = parsed.data;
  if (v.website) return { ok: false, error: "No pudimos enviar la solicitud. Probá de nuevo en unos minutos." };
  const birth = new Date(`${v.birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || birth > new Date() || birth.getFullYear() < 1920) return { ok: false, error: "La fecha de nacimiento no es válida." };

  const supabase = createAdminClient();
  const { data: enrollmentId, error } = await supabase.rpc("create_training_enrollment", {
    p_pack_id: v.packId,
    p_billing: v.billing,
    p_student_name: v.studentName,
    p_birth_date: v.birthDate,
    p_guardian_name: v.guardianName,
    p_phone: v.phone,
    p_email: v.email || null,
    p_emergency: v.emergency || null,
    p_health: v.health || null,
    p_days: v.days,
    p_time: v.time || null,
    p_notes: v.notes || null,
  });
  if (error) {
    if (!error.code || !ERR[error.code]) console.error("[entrenamientos] alta", error.code, error.message);
    return { ok: false, error: (error.code && ERR[error.code]) || "No pudimos enviar la solicitud. Probá de nuevo en unos minutos." };
  }
  after(() => notifyStaff({ title: "Nueva inscripción a entrenamientos", body: `${v.studentName} · solicitud por revisar`, url: "/admin/entrenamientos", tag: "training" }));
  return { ok: true, id: String(enrollmentId) };
}

export type EnrollmentLive = "pending" | "active" | "paused" | "cancelled" | "unknown";

/** Estado de una solicitud (solo el estado; el id es un uuid que solo conoce quien la envió). */
export async function checkEnrollmentStatus(id: string): Promise<EnrollmentLive> {
  if (!z.string().uuid().safeParse(id).success) return "unknown";
  const supabase = createAdminClient();
  const { data } = await supabase.from("training_enrollments").select("status").eq("id", id).maybeSingle();
  return (data?.status as EnrollmentLive | undefined) ?? "unknown";
}
