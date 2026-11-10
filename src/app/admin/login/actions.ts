"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeAdminPath } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type LoginState = { error?: string };

const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(30).regex(/^[a-z0-9._-]+$/),
  password: z.string().min(6).max(200),
});

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Ingresá tu usuario y contraseña." };

  // El usuario se traduce al email interno de Auth; el cliente nunca ve ese email.
  const BAD = "Usuario o contraseña incorrectos.";
  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("id").eq("username", parsed.data.username).maybeSingle();
  if (!prof) return { error: BAD };
  const { data: authUser } = await admin.auth.admin.getUserById(prof.id);
  const email = authUser?.user?.email;
  if (!email) return { error: BAD };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  // Mensaje genérico: no revelar si el usuario existe.
  if (error || !data.user) return { error: BAD };

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
