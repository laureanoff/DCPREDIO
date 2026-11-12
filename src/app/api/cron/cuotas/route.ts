import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDueRows } from "@/queries/training-dues";
import { notifyStaff } from "@/services/push";

/** Aviso diario (lo dispara Vercel Cron): si hay alumnos con cuota atrasada, avisa al personal por notificación al celular. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const ok = Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

  const rows = await loadDueRows(createAdminClient());
  const late = rows.filter((r) => r.due.state === "overdue" || r.due.state === "classes_due");
  if (late.length > 0) {
    await notifyStaff({
      title: "Cuotas de entrenamientos",
      body: late.length === 1 ? `${late[0].student} tiene la cuota pendiente.` : `${late.length} alumnos tienen la cuota pendiente.`,
      url: "/admin/entrenamientos?vista=cuotas",
      tag: "dues",
    });
  }
  return NextResponse.json({ ok: true, late: late.length });
}
