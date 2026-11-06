import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDateShort, formatTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/utils";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;
type LogRow = Database["public"]["Tables"]["notification_logs"]["Row"];
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 3000];

/** Variables de entorno que faltan para poder enviar mensajes (solo nombres, nunca valores). */
export function getWhatsAppStatus(): { configured: boolean; missing: string[]; customerEnabled: boolean } {
  const env = readEnv();
  const missing: string[] = [];
  if (!env.WHATSAPP_ACCESS_TOKEN) missing.push("WHATSAPP_ACCESS_TOKEN");
  if (!env.WHATSAPP_PHONE_NUMBER_ID) missing.push("WHATSAPP_PHONE_NUMBER_ID");
  if (!env.WHATSAPP_TEMPLATE_VENUE) missing.push("WHATSAPP_TEMPLATE_VENUE");
  return { configured: missing.length === 0, missing, customerEnabled: Boolean(env.WHATSAPP_TEMPLATE_CUSTOMER) };
}

/** Telegram: canal gratuito. Solo nombres de variables que faltan, nunca valores. */
export function getTelegramStatus(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.TELEGRAM_BOT_TOKEN) missing.push("TELEGRAM_BOT_TOKEN");
  if (!process.env.TELEGRAM_CHAT_ID) missing.push("TELEGRAM_CHAT_ID");
  return { configured: missing.length === 0, missing };
}

async function sendTelegram(chatId: string, text: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "Telegram no está configurado en el servidor.", retryable: false };
  let res: Response;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, error: "No se pudo conectar con Telegram (red o tiempo agotado).", retryable: true };
  }
  const body = (await res.json().catch(() => null)) as { ok?: boolean; result?: { message_id: number }; description?: string } | null;
  if (res.ok && body?.ok && body.result) return { ok: true, messageId: String(body.result.message_id) };
  return {
    ok: false,
    error: `Telegram rechazó el mensaje: ${body?.description ?? `HTTP ${res.status}`}`.slice(0, 500),
    retryable: res.status >= 500 || res.status === 429,
  };
}

function telegramText(b: BookingRow): string {
  return [
    `Nueva reserva ${b.code}`,
    `${b.customer_name} · ${b.customer_phone}`,
    `${formatDateShort(b.start_at)} de ${formatTime(b.start_at)} a ${formatTime(b.end_at)}`,
    `Total: ${formatMoney(Number(b.total_price))}`,
  ].join("\n");
}

function readEnv() {
  // Los datos de WhatsApp son opcionales: no exigimos la service role acá.
  return {
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_VENUE_NUMBER: process.env.WHATSAPP_VENUE_NUMBER,
    WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION || "v21.0",
    WHATSAPP_TEMPLATE_VENUE: process.env.WHATSAPP_TEMPLATE_VENUE,
    WHATSAPP_TEMPLATE_CUSTOMER: process.env.WHATSAPP_TEMPLATE_CUSTOMER,
    WHATSAPP_TEMPLATE_LANGUAGE: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "es_AR",
  };
}

const digits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

/** Los parámetros de plantilla no admiten saltos de línea, tabulaciones ni muchos espacios seguidos. */
const param = (v: string) => v.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 200) || "-";

type SendResult = { ok: true; messageId: string } | { ok: false; error: string; retryable: boolean };

async function sendTemplate(to: string, template: string, params: string[]): Promise<SendResult> {
  const env = readEnv();
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return { ok: false, error: "WhatsApp no está configurado en el servidor.", retryable: false };
  }

  let res: Response;
  try {
    res = await fetch(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text: param(text) })) }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, error: "No se pudo conectar con WhatsApp (red o tiempo agotado).", retryable: true };
  }

  const body = (await res.json().catch(() => null)) as {
    messages?: { id: string }[];
    error?: { message?: string; code?: number; error_subcode?: number };
  } | null;

  if (res.ok && body?.messages?.[0]?.id) return { ok: true, messageId: body.messages[0].id };

  const code = body?.error?.code;
  const retryable = res.status >= 500 || res.status === 429 || code === 4 || code === 80007 || code === 130429 || code === 131056;
  const detail = body?.error?.message ?? `HTTP ${res.status}`;
  return { ok: false, error: `WhatsApp rechazó el mensaje${code ? ` (código ${code})` : ""}: ${detail}`.slice(0, 500), retryable };
}

function templateParams(type: string, b: BookingRow): string[] {
  const when = [formatDateShort(b.start_at), `${formatTime(b.start_at)} a ${formatTime(b.end_at)}`];
  if (type === "customer") return [b.customer_name, b.code, ...when, formatMoney(Number(b.total_price))];
  // Plantilla del predio: {{1}} código, {{2}} nombre, {{3}} teléfono, {{4}} fecha, {{5}} horario, {{6}} total
  return [b.code, b.customer_name, b.customer_phone, ...when, formatMoney(Number(b.total_price))];
}

/** Intenta enviar un aviso registrado (hasta 3 intentos con espera si el error es transitorio) y deja el resultado en el log. */
export async function deliverNotification(db: Db, logId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: log } = await db.from("notification_logs").select("*").eq("id", logId).maybeSingle();
  if (!log) return { ok: false, error: "El aviso no existe." };
  if (log.status === "sent") return { ok: true };
  const isTelegram = log.channel === "telegram";
  if (!log.booking_id || !log.recipient_number || (!isTelegram && !log.template_name)) {
    return { ok: false, error: "Al aviso le faltan datos para enviarse." };
  }
  const { data: booking } = await db.from("bookings").select("*").eq("id", log.booking_id).maybeSingle();
  if (!booking) return { ok: false, error: "La reserva del aviso no existe." };

  const to = log.recipient_number;
  const send = () =>
    isTelegram ? sendTelegram(to, telegramText(booking)) : sendTemplate(to, log.template_name as string, templateParams(log.recipient_type, booking));
  let attempts = log.attempts;
  let last: SendResult = { ok: false, error: "Sin intentos.", retryable: false };

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    last = await send();
    attempts += 1;
    const now = new Date().toISOString();
    if (last.ok) {
      await db
        .from("notification_logs")
        .update({ status: "sent", attempts, last_attempt_at: now, sent_at: now, provider_message_id: last.messageId, error: null })
        .eq("id", logId);
      return { ok: true };
    }
    await db.from("notification_logs").update({ status: "failed", attempts, last_attempt_at: now, error: last.error }).eq("id", logId);
    if (!last.retryable || i === MAX_ATTEMPTS - 1) break;
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i] ?? 3000));
  }
  console.error("[avisos] aviso no enviado:", logId, last.ok ? "" : last.error);
  return { ok: false, error: last.ok ? undefined : last.error };
}

async function createLog(db: Db, row: Database["public"]["Tables"]["notification_logs"]["Insert"]): Promise<LogRow | null> {
  const { data, error } = await db.from("notification_logs").insert(row).select("*").single();
  if (error) {
    console.error("[avisos] no se pudo registrar el aviso:", error.message);
    return null;
  }
  return data;
}

type Target = { channel: "telegram" | "whatsapp"; type: "venue" | "customer"; number: string; template?: string };

/**
 * Avisa de una reserva nueva por los canales configurados: Telegram (gratis) y/o WhatsApp (plantillas de Meta, con costo).
 * Si no hay ningún canal configurado queda un registro "No enviado" visible en el panel. Nunca lanza.
 */
export async function notifyNewBooking(db: Db, bookingId: string): Promise<void> {
  try {
    const env = readEnv();
    const { data: settings } = await db.from("venue_settings").select("notification_whatsapp_number").eq("id", 1).single();
    const { data: booking } = await db.from("bookings").select("customer_phone").eq("id", bookingId).single();
    const wa = getWhatsAppStatus();
    const tg = getTelegramStatus();
    const waRequested = Boolean(env.WHATSAPP_ACCESS_TOKEN || env.WHATSAPP_PHONE_NUMBER_ID || env.WHATSAPP_TEMPLATE_VENUE);

    const targets: Target[] = [];
    if (tg.configured) targets.push({ channel: "telegram", type: "venue", number: process.env.TELEGRAM_CHAT_ID as string });
    if (waRequested) {
      const venueNumber = digits(settings?.notification_whatsapp_number) || digits(env.WHATSAPP_VENUE_NUMBER);
      targets.push({ channel: "whatsapp", type: "venue", number: venueNumber, template: env.WHATSAPP_TEMPLATE_VENUE });
      if (env.WHATSAPP_TEMPLATE_CUSTOMER && booking) {
        targets.push({ channel: "whatsapp", type: "customer", number: digits(booking.customer_phone), template: env.WHATSAPP_TEMPLATE_CUSTOMER });
      }
    }

    if (targets.length === 0) {
      await createLog(db, {
        booking_id: bookingId,
        channel: "none",
        recipient_type: "venue",
        status: "failed",
        error: "No hay ningún canal de avisos configurado (Telegram o WhatsApp). Ver docs/notificaciones.md.",
      });
      return;
    }

    for (const t of targets) {
      const log = await createLog(db, {
        booking_id: bookingId,
        channel: t.channel,
        recipient_type: t.type,
        recipient_number: t.number || null,
        template_name: t.template ?? null,
        status: "pending",
      });
      if (!log) continue;

      if (t.channel === "whatsapp" && (!wa.configured || !t.template)) {
        await db.from("notification_logs").update({ status: "failed", error: `WhatsApp no configurado: falta ${wa.missing.join(", ") || "la plantilla"}.` }).eq("id", log.id);
        continue;
      }
      if (!t.number) {
        await db.from("notification_logs").update({ status: "failed", error: t.type === "venue" ? "Falta el número de WhatsApp del predio (Configuración → Avisos)." : "Falta el teléfono del cliente." }).eq("id", log.id);
        continue;
      }
      await deliverNotification(db, log.id);
    }
  } catch (e) {
    console.error("[avisos] error inesperado al notificar:", e instanceof Error ? e.message : e);
  }
}
