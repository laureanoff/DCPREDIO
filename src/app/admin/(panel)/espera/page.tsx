import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { whatsappLink } from "@/business/confirmation-message";
import { WaitlistUI, type Group } from "./waitlist-ui";

export const metadata: Metadata = { title: "Lista de espera" };

const tz = "America/Argentina/Cordoba";
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
const dateLabel = (iso: string) => new Intl.DateTimeFormat("es-AR", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
const hhmm = (iso: string) => new Intl.DateTimeFormat("es-AR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

async function Content() {
  await connection();
  await requireStaff();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // Quita lo vencido (turnos que ya pasaron).
  await supabase.from("waitlist_entries").delete().lte("end_at", nowIso);

  const [{ data: entries }, { data: settings }, { data: courts }] = await Promise.all([
    supabase.from("waitlist_entries").select("id, court_id, start_at, end_at, customer_name, customer_phone, created_at").gt("end_at", nowIso).order("start_at").order("created_at").limit(300),
    supabase.from("venue_settings").select("venue_name").eq("id", 1).single(),
    supabase.from("courts").select("id, name").eq("is_active", true),
  ]);
  const venue = settings?.venue_name ?? "el predio";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // Estado actual de cada turno con gente esperando.
  const keys = Array.from(new Set((entries ?? []).map((e) => `${e.court_id}|${dayKey(e.start_at)}`)));
  const free = new Set<string>();
  await Promise.all(
    keys.map(async (k) => {
      const [court, date] = k.split("|");
      const { data } = await supabase.rpc("get_day_availability", { p_court_id: court, p_date: date });
      for (const s of data ?? []) if (s.state === "available") free.add(`${court}|${new Date(s.slot_start).getTime()}`);
    }),
  );

  const groups = new Map<string, Group>();
  for (const e of entries ?? []) {
    const k = `${e.court_id}|${e.start_at}`;
    const g = groups.get(k) ?? {
      key: k,
      label: `${dateLabel(e.start_at)} · ${hhmm(e.start_at)} a ${hhmm(e.end_at)}`,
      court: (courts?.length ?? 0) > 1 ? (courts?.find((c) => c.id === e.court_id)?.name ?? "") : "",
      free: free.has(`${e.court_id}|${new Date(e.start_at).getTime()}`),
      people: [],
    };
    const msg = `¡Hola ${e.customer_name}! Se liberó el turno del ${dateLabel(e.start_at)} de ${hhmm(e.start_at)} a ${hhmm(e.end_at)} en ${venue}. ¿Lo querés? Reservalo ya en ${siteUrl || "nuestra web"} o respondeme por acá.`;
    g.people.push({ id: e.id, name: e.customer_name, phone: e.customer_phone, wa: whatsappLink(e.customer_phone, msg) });
    groups.set(k, g);
  }

  return <WaitlistUI groups={Array.from(groups.values())} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Content />
    </Suspense>
  );
}
