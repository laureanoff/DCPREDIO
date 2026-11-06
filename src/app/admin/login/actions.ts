"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeAdminPath } from "@/lib/auth";

export type LoginState = { error?: string };

const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(6).max(200),
});

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Ingresá un email y una contraseña válidos." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  // Mensaje genérico: no revelar si el email existe.
  if (error || !data.user) return { error: "Email o contraseña incorrectos." };

  // Un usuario de Auth sin perfil activo NO tiene acceso al panel.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { error: "Tu usuario no tiene acceso al panel." };
  }

  const next = formData.get("next");
  redirect(safeAdminPath(typeof next === "string" ? next : null));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
