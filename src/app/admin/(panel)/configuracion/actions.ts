"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/services/geocode";
import type { ActionResult } from "../reservas/actions";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horario inválido.");
const optionalText = (max: number) => z.string().trim().max(max);
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-().]/g, ""))
  .refine((v) => v === "" || /^\+?[0-9]{8,15}$/.test(v), { message: "Teléfono inválido (usá solo números, con código de área)." });

const schema = z.object({
  venueName: z.string().trim().min(1, "El nombre del predio es obligatorio.").max(80),
  address: optionalText(200),
  contactPhone: phone,
  contactEmail: z.string().trim().max(200).refine((v) => v === "" || z.string().email().safeParse(v).success, { message: "Email inválido." }),
  contactWhatsapp: phone,
  priceTurn: z.number().min(0, "El precio no puede ser negativo.").max(100_000_000),
  maxPlayers: z.number().int().min(1).max(50),
  slotDurationMinutes: z.number().int().min(15).max(480),
  slotGapMinutes: z.number().int().min(0).max(120),
  bookingWindowDays: z.number().int().min(1).max(365),
  maxActiveBookingsPerPhone: z.number().int().min(1).max(20),
  requireConfirmation: z.boolean(),
  allowCustomerCancellation: z.boolean(),
  cancellationCutoffHours: z.number().int().min(0).max(168),
  hours: z
    .array(z.object({ weekday: z.number().int().min(0).max(6), isOpen: z.boolean(), open: time, close: time }))
    .length(7),
});

export async function saveSettings(raw: z.input<typeof schema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  const v = parsed.data;

  for (const h of v.hours) {
    if (h.isOpen && h.open === h.close) return { ok: false, error: "El horario de apertura y cierre no pueden ser iguales." };
  }

  const supabase = await createClient();

  // Coordenadas para el mapa 3D: se recalculan solo si cambió la dirección (o si todavía no hay).
  const { data: prev } = await supabase.from("venue_settings").select("address, latitude, longitude").eq("id", 1).maybeSingle();
  const newAddress = v.address.trim();
  let latitude = prev?.latitude ?? null;
  let longitude = prev?.longitude ?? null;
  let located = true;
  if (!newAddress) {
    latitude = null;
    longitude = null;
  } else if (newAddress !== (prev?.address ?? "").trim() || latitude === null || longitude === null) {
    const point = await geocodeAddress(newAddress);
    latitude = point?.lat ?? null;
    longitude = point?.lng ?? null;
    located = point !== null;
  }

  const { data, error } = await supabase
    .from("venue_settings")
    .update({
      latitude,
      longitude,
      venue_name: v.venueName,
      address: v.address || null,
      contact_phone: v.contactPhone || null,
      contact_email: v.contactEmail || null,
      contact_whatsapp: v.contactWhatsapp || null,
      price_group: v.priceTurn,
      max_players: v.maxPlayers,
      slot_duration_minutes: v.slotDurationMinutes,
      slot_gap_minutes: v.slotGapMinutes,
      booking_window_days: v.bookingWindowDays,
      max_active_bookings_per_phone: v.maxActiveBookingsPerPhone,
      require_confirmation: v.requireConfirmation,
      allow_customer_cancellation: v.allowCustomerCancellation,
      cancellation_cutoff_hours: v.cancellationCutoffHours,
    })
    .eq("id", 1)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[admin/config]", error.code, error.message);
    return { ok: false, error: "No se pudo guardar la configuración." };
  }
  if (!data) return { ok: false, error: "No tenés permiso para cambiar la configuración." };

  for (const h of v.hours) {
    const { error: hErr } = await supabase
      .from("operating_hours")
      .update({ is_open: h.isOpen, open_time: h.open, close_time: h.close })
      .eq("weekday", h.weekday);
    if (hErr) {
      console.error("[admin/config] horarios", hErr.code, hErr.message);
      return { ok: false, error: "Se guardaron los datos, pero falló la actualización de horarios. Intentá de nuevo." };
    }
  }

  updateTag("venue"); // la web pública toma los precios y horarios nuevos de inmediato
  revalidatePath("/admin", "layout");
  if (!located) {
    return {
      ok: true,
      message: "Configuración guardada, pero no pudimos ubicar la dirección en el mapa 3D (se muestra un mapa común). Probá con calle, número y ciudad.",
    };
  }
  return { ok: true, message: "Configuración guardada. Ya se ve en la web pública." };
}
