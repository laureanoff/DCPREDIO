import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StaffContext = {
  userId: string;
  email: string | null;
  fullName: string;
  role: "admin" | "staff";
};

/** Devuelve el usuario autenticado SOLO si tiene un perfil activo; si no, null. */
export const getStaff = cache(async (): Promise<StaffContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;
  return { userId: user.id, email: user.email ?? null, fullName: profile.full_name, role: profile.role };
});

export async function requireStaff(): Promise<StaffContext> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login?error=unauthorized");
  return staff;
}

export async function requireAdmin(): Promise<StaffContext> {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin?error=forbidden");
  return staff;
}

/** Solo permite redirigir a rutas internas del panel. */
export function safeAdminPath(next: string | null | undefined): string {
  if (next && next.startsWith("/admin") && !next.startsWith("//") && !next.includes("\\")) return next;
  return "/admin";
}
