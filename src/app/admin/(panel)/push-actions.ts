"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
});

export async function savePushSubscription(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  const p = subSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Suscripción inválida." };
  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  // Se guarda con la clave de servicio (la tabla no permite insertar al navegador), siempre a nombre del usuario logueado.
  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert({ user_id: staff.userId, endpoint: p.data.endpoint, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth, user_agent: ua }, { onConflict: "endpoint" });
  if (error) {
    console.error("[push] guardar", error.code, error.message);
    return { ok: false, error: "No se pudo guardar el dispositivo." };
  }
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  await requireStaff();
  const supabase = await createClient(); // RLS: solo borra los propios
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}
