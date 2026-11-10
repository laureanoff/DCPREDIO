import { connection } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { todayKey } from "@/lib/datetime";
import type { PublicVenue } from "@/queries/venue";

/** "Hoy quedan N turnos": se calcula en cada visita con la disponibilidad real. */
export async function TodayBadge({ venue }: { venue: PublicVenue }) {
  await connection();
  const supabase = createAnonClient();
  const today = todayKey(venue.timezone);
  const results = await Promise.all(venue.courts.map((c) => supabase.rpc("get_day_availability", { p_court_id: c.id, p_date: today })));
  if (results.some((r) => r.error)) return null;
  const all = results.flatMap((r) => r.data ?? []);
  if (all.length === 0) return null; // cerrado hoy
  const free = all.filter((s) => s.state === "available").length;
  const none = free === 0;
  return (
    <p className="today-badge mt-6 inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/80 px-4 py-2 text-sm font-semibold backdrop-blur">
      <span className={none ? "h-2.5 w-2.5 rounded-full bg-danger" : "live-dot"} aria-hidden />
      {none ? "Hoy no quedan turnos libres" : free === 1 ? "Hoy queda 1 turno libre" : `Hoy quedan ${free} turnos libres`}
    </p>
  );
}
