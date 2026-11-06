"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deliverNotification } from "@/services/whatsapp";
import type { ActionResult } from "../reservas/actions";

/** Reintenta un aviso que falló. Usa la sesión de quien lo pide; el envío usa las credenciales del servidor. */
export async function resendNotification(logId: string): Promise<ActionResult> {
  await requireStaff();
  if (!z.string().uuid().safeParse(logId).success) return { ok: false, error: "Aviso inválido." };
  const supabase = await createClient();
  const result = await deliverNotification(supabase, logId);
  revalidatePath("/admin", "layout");
  return result.ok ? { ok: true, message: "Aviso enviado." } : { ok: false, error: result.error ?? "No se pudo enviar el aviso." };
}
