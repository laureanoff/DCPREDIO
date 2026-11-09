import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getStaff, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/datetime";
import { BlockForm, BlockList, SpecialDays } from "./blocks-ui";

export const metadata: Metadata = { title: "Bloqueos" };

async function Content() {
  await connection();
  await requireStaff();
  const staff = await getStaff();
  const isAdmin = staff?.role === "admin";
  const supabase = await createClient();
  const today = todayKey();
  const nowIso = new Date().toISOString();

  const [courts, blocks, specials] = await Promise.all([
    supabase.from("courts").select("id, name").eq("is_active", true).order("sort_order").order("created_at"),
    supabase.from("blocked_slots").select("id, court_id, start_at, end_at, reason").gt("end_at", nowIso).order("start_at").limit(100),
    supabase.from("special_days").select("id, day, is_closed, open_time, close_time, note").gte("day", today).order("day").limit(100),
  ]);
  const courtList = courts.data ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Bloqueos</h1>
      <p className="text-sm text-muted">Bloqueá horarios por lluvia, mantenimiento o torneo. Los clientes dejan de verlos disponibles.</p>
      <BlockForm courts={courtList} today={today} />
      <BlockList
        multiCourt={courtList.length > 1}
        courtNames={Object.fromEntries(courtList.map((c) => [c.id, c.name]))}
        blocks={(blocks.data ?? []).map((b) => ({ id: b.id, courtId: b.court_id, startAt: b.start_at, endAt: b.end_at, reason: b.reason ?? "" }))}
      />
      {isAdmin && (
        <SpecialDays
          today={today}
          days={(specials.data ?? []).map((d) => ({ id: d.id, day: d.day, closed: d.is_closed, open: d.open_time?.slice(0, 5) ?? "", close: d.close_time?.slice(0, 5) ?? "", note: d.note ?? "" }))}
        />
      )}
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
