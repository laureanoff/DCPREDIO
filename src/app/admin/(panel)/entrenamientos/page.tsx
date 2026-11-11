import { Suspense } from "react";
import { PanelLoading } from "@/components/ui/Loaders";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getStaff, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EnrollmentList, type EnrollmentRow } from "./enrollment-list";

export const metadata: Metadata = { title: "Entrenamientos" };

const FILTERS = [
  ["pending", "Pendientes"],
  ["active", "Activos"],
  ["paused", "En pausa"],
  ["cancelled", "Bajas"],
  ["all", "Todos"],
] as const;

async function Content({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await connection();
  await requireStaff();
  const staff = await getStaff();
  const { estado } = await searchParams;
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
    };
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Entrenamientos</h1>
          <p className="text-sm text-muted">Inscripciones de alumnos a clases y entrenamientos. El cobro se hace en el predio.</p>
        </div>
        {staff?.role === "admin" && (
          <Link href="/admin/configuracion#entrenamientos" className="h-10 rounded-xl border border-border px-4 text-sm font-semibold leading-10 transition hover:border-lime">
            Editar actividades, packs y precios
          </Link>
        )}
      </div>

      <nav aria-label="Filtrar inscripciones" className="flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/entrenamientos?estado=${k}`}
            aria-current={filter === k ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${filter === k ? "border-lime bg-lime/15 text-lime-ink" : "border-border text-muted hover:text-foreground"}`}
          >
            {label}
            {k !== "all" && <span className="ml-1.5 text-xs opacity-70">{count(k)}</span>}
          </Link>
        ))}
      </nav>

      <EnrollmentList rows={enrollments} isAdmin={staff?.role === "admin"} />
    </div>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  return (
    <Suspense fallback={<PanelLoading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
