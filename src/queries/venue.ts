import { cacheLife, cacheTag } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";

export type PublicVenue = {
  name: string;
  logoUrl: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactWhatsapp: string | null;
  currency: string;
  timezone: string;
  priceIndividual: number;
  priceGroup: number;
  maxPlayers: number;
  slotDurationMinutes: number;
  bookingWindowDays: number;
  requireConfirmation: boolean;
  courtId: string; // cancha por defecto (la primera activa)
  courts: { id: string; name: string }[];
  hours: { weekday: number; isOpen: boolean; open: string; close: string }[];
};

// Columnas públicas (el rol anónimo no puede leer el resto, p. ej. el número que recibe los avisos).
const PUBLIC_COLUMNS =
  "venue_name, logo_url, address, latitude, longitude, contact_phone, contact_email, contact_whatsapp, currency, timezone, " +
  "price_individual, price_group, max_players, slot_duration_minutes, booking_window_days, require_confirmation";

/** Configuración pública del predio. Se refresca sola cada pocos minutos (no hace falta redeploy). */
export async function getPublicVenue(): Promise<PublicVenue> {
  "use cache";
  cacheLife("minutes");
  cacheTag("venue");

  const supabase = createAnonClient();
  const [settings, courtsRes, hours] = await Promise.all([
    supabase.from("venue_settings").select(PUBLIC_COLUMNS).eq("id", 1).single(),
    supabase.from("courts").select("id, name").eq("is_active", true).order("sort_order").order("created_at"),
    supabase.from("operating_hours").select("weekday, is_open, open_time, close_time").order("weekday"),
  ]);

  if (settings.error || !settings.data) throw new Error(`No se pudo leer la configuración: ${settings.error?.message}`);
  if (courtsRes.error || !courtsRes.data?.length) throw new Error(`No hay canchas activas: ${courtsRes.error?.message}`);
  if (hours.error) throw new Error(`No se pudieron leer los horarios: ${hours.error.message}`);

  const s = settings.data as unknown as Record<string, string | number | boolean | null>;
  return {
    name: s.venue_name as string,
    logoUrl: s.logo_url as string | null,
    address: s.address as string | null,
    latitude: s.latitude === null ? null : Number(s.latitude),
    longitude: s.longitude === null ? null : Number(s.longitude),
    contactPhone: s.contact_phone as string | null,
    contactEmail: s.contact_email as string | null,
    contactWhatsapp: s.contact_whatsapp as string | null,
    currency: s.currency as string,
    timezone: s.timezone as string,
    priceIndividual: Number(s.price_individual),
    priceGroup: Number(s.price_group),
    maxPlayers: Number(s.max_players),
    slotDurationMinutes: Number(s.slot_duration_minutes),
    bookingWindowDays: Number(s.booking_window_days),
    requireConfirmation: Boolean(s.require_confirmation),
    courtId: courtsRes.data[0].id,
    courts: courtsRes.data,
    hours: (hours.data ?? []).map((h) => ({
      weekday: h.weekday,
      isOpen: h.is_open,
      open: h.open_time.slice(0, 5),
      close: h.close_time.slice(0, 5),
    })),
  };
}
