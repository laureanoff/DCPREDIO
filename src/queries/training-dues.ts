import type { SupabaseClient } from "@supabase/supabase-js";
import { computeDue, type Due } from "@/business/training-dues";
import type { Billing } from "@/lib/training";
import type { Database } from "@/types/database";

export type DueRow = {
  id: string;
  student: string;
  guardian: string;
  phone: string;
  activity: string;
  pack: string;
  billing: Billing;
  price: number;
  startDate: string | null;
  due: Due;
  presentMonth: number;
  absentMonth: number;
};

export const todayAR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Cordoba" }).format(new Date());

/** Estado de cuota y asistencia del mes de todos los alumnos activos. Sirve tanto con el usuario del panel como con el cliente del servidor (aviso diario). */
export async function loadDueRows(supabase: SupabaseClient<Database>): Promise<DueRow[]> {
  const today = todayAR();
  const monthStart = `${today.slice(0, 7)}-01`;

  const { data: enr, error } = await supabase
    .from("training_enrollments")
    .select("id, activity_name, pack_name, billing, price, start_date, training_students(full_name, guardian_name, phone)")
    .eq("status", "active")
    .order("created_at");
  if (error) throw new Error(`No se pudieron leer los alumnos: ${error.message}`);
  const ids = (enr ?? []).map((e) => e.id);
  if (ids.length === 0) return [];

  const [pays, atts] = await Promise.all([
    supabase.from("training_payments").select("enrollment_id, amount").in("enrollment_id", ids).eq("is_voided", false),
    supabase.from("training_attendance").select("enrollment_id, class_date, status").in("enrollment_id", ids),
  ]);
  if (pays.error || atts.error) throw new Error(`No se pudieron leer los cobros o la asistencia: ${(pays.error ?? atts.error)?.message}`);

  const paid = new Map<string, number>();
  for (const p of pays.data ?? []) paid.set(p.enrollment_id, (paid.get(p.enrollment_id) ?? 0) + Number(p.amount));
  const present = new Map<string, number>();
  const presentMonth = new Map<string, number>();
  const absentMonth = new Map<string, number>();
  for (const a of atts.data ?? []) {
    const inMonth = a.class_date >= monthStart;
    if (a.status === "present") {
      present.set(a.enrollment_id, (present.get(a.enrollment_id) ?? 0) + 1);
      if (inMonth) presentMonth.set(a.enrollment_id, (presentMonth.get(a.enrollment_id) ?? 0) + 1);
    } else if (a.status === "absent" && inMonth) absentMonth.set(a.enrollment_id, (absentMonth.get(a.enrollment_id) ?? 0) + 1);
  }

  return (enr ?? []).map((e) => {
    const s = Array.isArray(e.training_students) ? e.training_students[0] : e.training_students;
    const billing = e.billing as Billing;
    return {
      id: e.id,
      student: s?.full_name ?? "(sin nombre)",
      guardian: s?.guardian_name ?? "",
      phone: s?.phone ?? "",
      activity: e.activity_name,
      pack: e.pack_name,
      billing,
      price: Number(e.price),
      startDate: e.start_date,
      due: computeDue({ billing, price: Number(e.price), startDate: e.start_date, paidTotal: paid.get(e.id) ?? 0, attended: present.get(e.id) ?? 0, today }),
      presentMonth: presentMonth.get(e.id) ?? 0,
      absentMonth: absentMonth.get(e.id) ?? 0,
    };
  });
}
