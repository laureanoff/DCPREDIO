import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BookingInput } from "@/validations/booking";

export type CreatedBooking = {
  id: string;
  code: string;
  startAt: string;
  endAt: string;
  mode: "individual" | "group";
  players: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  customerName: string;
  customerPhone: string;
};

export type CreateBookingResult =
  | { ok: true; booking: CreatedBooking }
  | { ok: false; error: string; refresh?: boolean };

// Mensajes para el cliente según el código de error de la base de datos.
const ERRORS: Record<string, { message: string; refresh?: boolean }> = {
  DC001: { message: "Ese turno acaba de ser reservado por otra persona. Elegí otro horario.", refresh: true },
  DC002: { message: "Ese horario no está disponible. Elegí otro.", refresh: true },
  DC003: { message: "No quedan lugares suficientes en ese turno. Elegí otro horario.", refresh: true },
  DC004: { message: "La cancha no está disponible en este momento." },
  DC005: { message: "Ingresá tu nombre y apellido." },
  DC006: { message: "Ese horario no es válido. Elegí otro.", refresh: true },
  DC007: { message: "Ingresá un teléfono válido, con código de área." },
  DC008: { message: "Ese turno ya pasó. Elegí otro horario.", refresh: true },
  DC009: { message: "Todavía no se pueden hacer reservas para esa fecha.", refresh: true },
  DC010: { message: "La cantidad de jugadores no es válida." },
  DC014: { message: "Ya tenés el máximo de reservas activas con este teléfono. Comunicate con el predio." },
};

/** Crea la reserva de forma atómica en la base (valida disponibilidad, calcula el precio y evita duplicados). */
export async function createPublicBooking(input: BookingInput): Promise<CreateBookingResult> {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    console.error("[booking] configuración de servidor incompleta:", e instanceof Error ? e.message : e);
    return { ok: false, error: "El sistema de reservas no está disponible en este momento. Intentá más tarde." };
  }

  // Toda reserva es el turno completo de la cancha: la capacidad sale de la configuración, nunca del navegador.
  const { data: settings, error: settingsError } = await supabase.from("venue_settings").select("max_players").eq("id", 1).single();
  if (settingsError || !settings) {
    console.error("[booking] no se pudo leer la configuración:", settingsError?.message);
    return { ok: false, error: "El sistema de reservas no está disponible en este momento. Intentá más tarde." };
  }

  const { data, error } = await supabase.rpc("create_public_booking", {
    p_court_id: input.courtId,
    p_start_at: input.startAt,
    p_customer_name: input.name,
    p_customer_phone: input.phone,
    p_mode: "group",
    p_players: settings.max_players,
    p_notes: input.notes || undefined,
  });

  if (error || !data) {
    const known = error?.code ? ERRORS[error.code] : undefined;
    if (known) return { ok: false, error: known.message, refresh: known.refresh };
    console.error("[booking] error inesperado:", error?.code, error?.message);
    return { ok: false, error: "No pudimos guardar tu reserva. Intentá de nuevo en unos minutos." };
  }

  return {
    ok: true,
    booking: {
      id: data.id,
      code: data.code,
      startAt: data.start_at,
      endAt: data.end_at,
      mode: data.mode,
      players: data.players,
      totalPrice: Number(data.total_price),
      status: data.status,
      customerName: data.customer_name,
      customerPhone: data.customer_phone,
    },
  };
}
