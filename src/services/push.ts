import "server-only";
import * as webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = { title: string; body: string; url: string; tag?: string };

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

/** Envía una notificación push a todos los dispositivos del personal. Nunca lanza: un fallo de push no debe romper la reserva. */
export async function notifyStaff(payload: PushPayload): Promise<void> {
  try {
    if (!configure()) return;
    const supabase = createAdminClient();
    const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
    if (!subs?.length) return;

    const body = JSON.stringify(payload);
    const dead: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 12, urgency: "high" });
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.push(s.id);
          else console.error("[push] envío falló", code);
        }
      }),
    );
    if (dead.length) await supabase.from("push_subscriptions").delete().in("id", dead);
  } catch (e) {
    console.error("[push] error", e instanceof Error ? e.message : e);
  }
}

/** Avisa al cliente (los dispositivos que activaron avisos para esa reserva). Nunca lanza. */
export async function notifyCustomer(bookingId: string, payload: PushPayload): Promise<void> {
  try {
    if (!configure()) return;
    const supabase = createAdminClient();
    const { data: subs } = await supabase.from("customer_push_subscriptions").select("id, endpoint, p256dh, auth").eq("booking_id", bookingId);
    if (!subs?.length) return;
    const body = JSON.stringify(payload);
    const dead: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24, urgency: "high" });
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.push(s.id);
          else console.error("[push] cliente falló", code);
        }
      }),
    );
    if (dead.length) await supabase.from("customer_push_subscriptions").delete().in("id", dead);
  } catch (e) {
    console.error("[push] error cliente", e instanceof Error ? e.message : e);
  }
}
