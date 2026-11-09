import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type BookingRow = Tables<"bookings">;
export type BookingWithMoney = BookingRow & { totalPaid: number; balance: number; paymentStatus: string; playersPaid: number };

export const PAGE_SIZE = 20;

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function attachMoney(supabase: SupabaseServer, rows: BookingRow[]): Promise<BookingWithMoney[]> {
  if (rows.length === 0) return [];
  const { data, error } = await supabase
    .from("booking_financials")
    .select("booking_id, total_paid, balance, payment_status")
    .in("booking_id", rows.map((r) => r.id));
  if (error) throw new Error(`No se pudieron leer los pagos: ${error.message}`);
  const byId = new Map((data ?? []).map((f) => [f.booking_id, f]));

  const { data: slotRows, error: slotError } = await supabase
    .from("payments")
    .select("booking_id")
    .in("booking_id", rows.map((r) => r.id))
    .eq("is_voided", false)
    .not("player_slot", "is", null);
  if (slotError) throw new Error(`No se pudieron leer los pagos: ${slotError.message}`);
  const paidCount = new Map<string, number>();
  for (const sr of slotRows ?? []) paidCount.set(sr.booking_id, (paidCount.get(sr.booking_id) ?? 0) + 1);

  return rows.map((r) => {
    const f = byId.get(r.id);
    return {
      playersPaid: paidCount.get(r.id) ?? 0,
      ...r,
      totalPaid: Number(f?.total_paid ?? 0),
      balance: Number(f?.balance ?? r.total_price),
      paymentStatus: f?.payment_status ?? "unpaid",
    };
  });
}

/** Reservas de un día (fecha del predio, YYYY-MM-DD), ordenadas por horario. */
export async function getDayBookings(date: string): Promise<BookingWithMoney[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("booking_date", date)
    .order("start_at")
    .order("created_at");
  if (error) throw new Error(`No se pudo leer la agenda: ${error.message}`);
  return attachMoney(supabase, data ?? []);
}

export async function getPendingCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getUpcomingCount(fromDate: string, toDate: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .gte("booking_date", fromDate)
    .lte("booking_date", toDate)
    .neq("status", "cancelled");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export type BookingFilters = {
  view: "upcoming" | "past" | "all";
  status?: BookingRow["status"];
  date?: string;
  q?: string;
  page: number;
};

/** Quita caracteres que rompen la sintaxis de filtros de PostgREST. */
function cleanSearch(q: string): string {
  return q.replace(/[,()%*\\"']/g, " ").trim().slice(0, 60);
}

export async function listBookings(f: BookingFilters): Promise<{ rows: BookingWithMoney[]; total: number }> {
  const supabase = await createClient();
  let query = supabase.from("bookings").select("*", { count: "exact" });

  if (f.date) query = query.eq("booking_date", f.date);
  else if (f.view === "upcoming") query = query.gte("end_at", new Date().toISOString());
  else if (f.view === "past") query = query.lt("end_at", new Date().toISOString());

  if (f.status) query = query.eq("status", f.status);

  const q = f.q ? cleanSearch(f.q) : "";
  if (q) {
    const digits = q.replace(/\D/g, "");
    const parts = [`customer_name.ilike.%${q}%`, `code.ilike.%${q}%`];
    if (digits.length >= 3) parts.push(`customer_phone.ilike.%${digits}%`);
    query = query.or(parts.join(","));
  }

  const ascending = f.view === "upcoming" || Boolean(f.date);
  const from = (f.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order("start_at", { ascending })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(`No se pudieron leer las reservas: ${error.message}`);
  return { rows: await attachMoney(supabase, data ?? []), total: count ?? 0 };
}

export async function getBooking(id: string): Promise<BookingWithMoney | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return (await attachMoney(supabase, [data]))[0];
}

/** Precios y límites vigentes (lectura completa: solo personal autenticado). */
export async function getAdminVenue() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venue_settings")
    .select("price_individual, price_group, max_players")
    .eq("id", 1)
    .single();
  if (error || !data) throw new Error(`No se pudo leer la configuración: ${error?.message}`);
  return {
    priceIndividual: Number(data.price_individual),
    priceGroup: Number(data.price_group),
    maxPlayers: Number(data.max_players),
  };
}

export type PaymentRow = Tables<"payments">;

/** Historial de pagos de una reserva (incluye los anulados, marcados). Del más reciente al más antiguo. */
export async function getPayments(bookingId: string): Promise<PaymentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("paid_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`No se pudieron leer los pagos: ${error.message}`);
  return data ?? [];
}

export type IncomeBucket = { bucket: string; total: number; payments: number };

/** Ingresos agrupados por fecha de pago (zona horaria del predio). Pagos anulados excluidos. */
export async function getIncome(params: {
  from: string;
  to: string;
  group: "month" | "day";
  method?: "cash" | "transfer" | "other";
}): Promise<IncomeBucket[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("income_summary", {
    p_from: params.from,
    p_to: params.to,
    p_group: params.group,
    p_method: params.method,
  });
  if (error) throw new Error(`No se pudieron calcular los ingresos: ${error.message}`);
  return (data ?? []).map((r) => ({ bucket: r.bucket, total: Number(r.total), payments: Number(r.payments) }));
}

export type VenueSettingsForm = {
  venueName: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  contactWhatsapp: string;
  priceTurn: number;
  maxPlayers: number;
  slotDurationMinutes: number;
  slotGapMinutes: number;
  bookingWindowDays: number;
  maxActiveBookingsPerPhone: number;
  requireConfirmation: boolean;
  allowCustomerCancellation: boolean;
  cancellationCutoffHours: number;
  hours: { weekday: number; isOpen: boolean; open: string; close: string }[];
};

/** Configuración completa del predio para el formulario del administrador. */
export async function getVenueSettingsForm(): Promise<VenueSettingsForm> {
  const supabase = await createClient();
  const [settings, hours] = await Promise.all([
    supabase.from("venue_settings").select("*").eq("id", 1).single(),
    supabase.from("operating_hours").select("weekday, is_open, open_time, close_time").order("weekday"),
  ]);
  if (settings.error || !settings.data) throw new Error(`No se pudo leer la configuración: ${settings.error?.message}`);
  if (hours.error) throw new Error(`No se pudieron leer los horarios: ${hours.error.message}`);
  const s = settings.data;
  return {
    venueName: s.venue_name,
    address: s.address ?? "",
    contactPhone: s.contact_phone ?? "",
    contactEmail: s.contact_email ?? "",
    contactWhatsapp: s.contact_whatsapp ?? "",
    priceTurn: Number(s.price_group),
    maxPlayers: s.max_players,
    slotDurationMinutes: s.slot_duration_minutes,
    slotGapMinutes: s.slot_gap_minutes,
    bookingWindowDays: s.booking_window_days,
    maxActiveBookingsPerPhone: s.max_active_bookings_per_phone,
    requireConfirmation: s.require_confirmation,
    allowCustomerCancellation: s.allow_customer_cancellation,
    cancellationCutoffHours: s.cancellation_cutoff_hours,
    hours: (hours.data ?? []).map((h) => ({
      weekday: h.weekday,
      isOpen: h.is_open,
      open: h.open_time.slice(0, 5),
      close: h.close_time.slice(0, 5),
    })),
  };
}

/** Bandeja de avisos: reservas nuevas esperando confirmación (las más recientes primero). */
export async function listPendingInbox(): Promise<BookingRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`No se pudieron leer los avisos: ${error.message}`);
  return data ?? [];
}

/** Reservas confirmadas en los últimos días (para enviarle la confirmación al cliente por WhatsApp). */
export async function listRecentlyConfirmed(days = 3): Promise<BookingRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("status", "confirmed")
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`No se pudieron leer las confirmadas: ${error.message}`);
  return data ?? [];
}
