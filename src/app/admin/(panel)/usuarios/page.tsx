import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmployeesUI } from "./employees-ui";

export const metadata: Metadata = { title: "Empleados" };

async function Content() {
  await connection();
  const me = await requireAdmin();
  const admin = createAdminClient();
  const { data: profiles } = await admin.from("profiles").select("id, full_name, username, role, is_active").in("role", ["staff", "admin"]).order("created_at");
  const mine = (profiles ?? []).find((p) => p.id === me.userId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Empleados</h1>
      <p className="text-sm text-muted">
        Los empleados pueden ver la agenda, cargar y confirmar reservas, cobrar, bloquear horarios y usar el buffet. No ven configuración, estadísticas, galería, respaldos ni esta sección.
      </p>
      <EmployeesUI myId={me.userId} myUsername={mine?.username ?? ""} employees={(profiles ?? []).filter((p) => p.role === "staff").map((p) => ({ id: p.id, name: p.full_name, username: p.username, active: p.is_active }))} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Content />
    </Suspense>
  );
}
