import { Suspense } from "react";
import { PanelLoading } from "@/components/ui/Loaders";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getStaff, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EnrollmentList, type EnrollmentRow } from "./enrollment-list";
import { Agenda, type DayStudent, type SessionRow } from "./agenda";
import { CoachEditor, TrainingManager, type ActivityRow } from "./training-manager";
import type { Billing } from "@/lib/training";

export const metadata: Metadata = { title: "Entrenamientos" };

const FILTERS = [
  ["pending", "Pendientes"],
  ["active", "Alumnos activos"],
  ["paused", "En pausa"],
  ["cancelled", "Bajas"],
  ["all", "Todos"],
] as const;

const VIEWS = [
  ["inscripciones", "Inscripciones y alumnos", false],
  ["agenda", "Días y horarios", false],
  ["packs", "Actividades y packs", true],
  ["web", "Profe y web", true],
] as const;

async function Content({ searchParams }: { searchParams: Promise<{ estado?: string; vista?: string }> }) {
  await connection();
  await requireStaff();
  const staff = await getStaff();
  const isAdmin = staff?.role === "admin";
  const { estado, vista } = await searchParams;
  const view = VIEWS.find(([k, , adm]) => k === vista && (!adm || isAdmin))?.[0] ?? "inscripciones";
  const filter = FILTERS.some(([k]) => k === estado) ? (estado as string) : "pending";
  const supabase = await createClient();

  const [rows, counts] = await Promise.all([
    (() => {
      let q = supabase
        .from("training_enrollments")
        .select("id, activity_name, pack_name, days_per_week, billing, price, preferred_days, preferred_time, notes, status, start_date, staff_notes, created_at, training_students(full_name, birth_date, guardian_name, phone, email, emergency_contact, health_notes)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (filter !== "all") q = q.eq("status", filter);
      return q;
    })(),
    supabase.from("training_enrollments").select("status"),
  ]);

  const ids = (rows.data ?? []).map((e) => e.id);
  const pays = ids.length
    ? (await supabase.from("training_payments").select("id, enrollment_id, amount, method, concept, paid_at, is_voided, void_reason").in("enrollment_id", ids).order("paid_at", { ascending: false })).data ?? []
    : [];

  const count = (s: string) => (counts.data ?? []).filter((r) => r.status === s).length;
  const enrollments: EnrollmentRow[] = (rows.data ?? []).map((e) => {
    const s = Array.isArray(e.training_students) ? e.training_students[0] : e.training_students;
    return {
      id: e.id,
      activity: e.activity_name,
      pack: e.pack_name,
      daysPerWeek: e.days_per_week,
      billing: e.billing,
      price: Number(e.price),
      preferredDays: e.preferred_days,
      preferredTime: e.preferred_time ?? "",
      notes: e.notes ?? "",
      status: e.status,
      startDate: e.start_date,
      staffNotes: e.staff_notes ?? "",
      createdAt: e.created_at,
      student: s?.full_name ?? "(sin nombre)",
      birthDate: s?.birth_date ?? null,
      guardian: s?.guardian_name ?? "",
      phone: s?.phone ?? "",
      email: s?.email ?? "",
      emergency: s?.emergency_contact ?? "",
      health: s?.health_notes ?? "",
      payments: pays
        .filter((x) => x.enrollment_id === e.id)
        .map((x) => ({ id: x.id, amount: Number(x.amount), method: x.method, concept: x.concept ?? "", paidAt: x.paid_at, voided: x.is_voided, voidReason: x.void_reason ?? "" })),
    };
  });

  const [sesRes, actRes, packRes, priceRes, coachRes, actives] = await Promise.all([
    supabase.from("training_sessions").select("id, weekday, start_time, end_time, title, details, is_active").order("weekday").order("start_time"),
    isAdmin ? supabase.from("training_activities").select("id, name, description, location, is_active").order("sort_order").order("created_at") : Promise.resolve({ data: [] }),
    isAdmin ? supabase.from("training_packs").select("id, activity_id, name, description, days_per_week, is_active").order("sort_order").order("days_per_week") : Promise.resolve({ data: [] }),
    isAdmin ? supabase.from("training_pack_prices").select("pack_id, billing, price") : Promise.resolve({ data: [] }),
    isAdmin ? supabase.from("training_settings").select("coach_name, coach_title, coach_bio, coach_story, show_coach, coach_photo_url, coach_photo_zoom, coach_photo_x, coach_photo_y").maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("training_enrollments").select("activity_name, status, preferred_days, training_students(full_name)").eq("status", "active"),
  ]);
  const sessions: SessionRow[] = (sesRes.data ?? []).map((x) => ({ id: x.id, weekday: x.weekday, start: x.start_time.slice(0, 5), end: x.end_time?.slice(0, 5) ?? "", title: x.title, details: x.details ?? "", isActive: x.is_active }));
  const byDay: Record<number, DayStudent[]> = {};
  for (const e of actives.data ?? []) {
    const st = Array.isArray(e.training_students) ? e.training_students[0] : e.training_students;
    for (const d of e.preferred_days ?? []) (byDay[d] ??= []).push({ name: st?.full_name ?? "(sin nombre)", activity: e.activity_name, status: e.status });
  }
  const activities: ActivityRow[] = (actRes.data ?? []).map((a) => ({
    id: a.id, name: a.name, description: a.description ?? "", location: a.location ?? "", isActive: a.is_active,
    packs: (packRes.data ?? []).filter((p) => p.activity_id === a.id).map((p) => ({
      id: p.id, name: p.name, description: p.description ?? "", daysPerWeek: p.days_per_week, isActive: p.is_active,
      prices: Object.fromEntries((priceRes.data ?? []).filter((x) => x.pack_id === p.id).map((x) => [x.billing, Number(x.price)])) as Partial<Record<Billing, number>>,
    })),
  }));
  const coach = { name: coachRes.data?.coach_name ?? "", title: coachRes.data?.coach_title ?? "", bio: coachRes.data?.coach_bio ?? "", story: coachRes.data?.coach_story ?? "", show: coachRes.data?.show_coach ?? true, photo: coachRes.data?.coach_photo_url ? { url: coachRes.data.coach_photo_url, zoom: Number(coachRes.data.coach_photo_zoom), x: coachRes.data.coach_photo_x, y: coachRes.data.coach_photo_y } : null };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Entrenamientos</h1>
          <p className="text-sm text-muted">Inscripciones de alumnos a clases y entrenamientos. El cobro se hace en el predio.</p>
        </div>
      </div>

      <nav aria-label="Secciones" className="flex flex-wrap gap-2 border-b border-border pb-3">
        {VIEWS.filter(([, , adm]) => !adm || isAdmin).map(([k, label]) => (
          <Link key={k} href={`/admin/entrenamientos?vista=${k}`} aria-current={view === k ? "page" : undefined}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${view === k ? "bg-lime text-black" : "border border-border text-muted hover:text-foreground"}`}>{label}</Link>
        ))}
      </nav>

      {view === "agenda" && <Agenda sessions={sessions} students={byDay} />}
      {view === "packs" && <TrainingManager activities={activities} />}
      {view === "web" && <CoachEditor coach={coach} />}
      {view === "inscripciones" && (<>
      <nav aria-label="Filtrar inscripciones" className="flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/entrenamientos?vista=inscripciones&estado=${k}`}
            aria-current={filter === k ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${filter === k ? "border-lime bg-lime/15 text-lime-ink" : "border-border text-muted hover:text-foreground"}`}
          >
            {label}
            {k !== "all" && <span className="ml-1.5 text-xs opacity-70">{count(k)}</span>}
          </Link>
        ))}
      </nav>

      <EnrollmentList rows={enrollments} isAdmin={isAdmin} />
      </>)}
    </div>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ estado?: string; vista?: string }> }) {
  return (
    <Suspense fallback={<PanelLoading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
