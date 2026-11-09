"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../reservas/actions";

export async function removeWaitlistEntry(id: string): Promise<ActionResult> {
  await requireStaff();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Anotación inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from("waitlist_entries").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo quitar de la lista." };
  revalidatePath("/admin/espera");
  return { ok: true, message: "Quitado de la lista de espera." };
}
