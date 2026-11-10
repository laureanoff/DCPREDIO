"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "../reservas/actions";

const idSchema = z.string().uuid();
const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,30}$/, "El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo.");

const createSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresá el nombre.").max(80),
  username: usernameSchema,
  password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres.").max(72),
});

/** Crea un empleado (rol «staff»): puede operar reservas, bloqueos y buffet, pero no configuración, galería, respaldos, estadísticas ni usuarios. */
export async function createEmployee(raw: z.input<typeof createSchema>): Promise<ActionResult> {
  const me = await requireAdmin();
  const p = createSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Datos inválidos." };
  const v = p.data;
  const admin = createAdminClient();

  const { data: taken } = await admin.from("profiles").select("id").eq("username", v.username).maybeSingle();
  if (taken) return { ok: false, error: "Ese usuario ya existe. Elegí otro." };

  // Auth exige un email: se usa una variante «+usuario» del email del administrador (nunca se muestra ni se usa para entrar).
  const [local, domain] = (me.email ?? "").split("@");
  if (!local || !domain) return { ok: false, error: "No se pudo generar el acceso del empleado." };
  const { data, error } = await admin.auth.admin.createUser({ email: `${local.split("+")[0]}+${v.username}@${domain}`, password: v.password, email_confirm: true, user_metadata: { full_name: v.fullName } });
  if (error || !data.user) {
    const exists = /already|registered|exists/i.test(error?.message ?? "");
    if (!exists) console.error("[usuarios] createUser", error?.message);
    return { ok: false, error: exists ? "Ese usuario ya existe. Elegí otro." : "No se pudo crear el usuario." };
  }
  const { error: pErr } = await admin.from("profiles").upsert({ id: data.user.id, full_name: v.fullName, username: v.username, role: "staff", is_active: true });
  if (pErr) {
    console.error("[usuarios] profile", pErr.message);
    await admin.auth.admin.deleteUser(data.user.id); // no dejar un usuario sin perfil
    return { ok: false, error: "No se pudo crear el perfil del empleado." };
  }
  revalidatePath("/admin/usuarios");
  return { ok: true, message: `Empleado creado. Pasale el usuario y la contraseña para que entre en /admin/login.` };
}

export async function setEmployeeActive(id: string, active: boolean): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Usuario inválido." };
  if (id === me.userId) return { ok: false, error: "No podés desactivar tu propio usuario." };
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").update({ is_active: active }).eq("id", id).eq("role", "staff").select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo actualizar el empleado." };
  if (!active) {
    // Cierra sus sesiones abiertas y quita sus dispositivos de notificaciones.
    await admin.from("push_subscriptions").delete().eq("user_id", id);
    await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });
  } else {
    await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
  }
  revalidatePath("/admin/usuarios");
  return { ok: true, message: active ? "Empleado reactivado." : "Empleado desactivado: ya no puede entrar." };
}

const pwSchema = z.string().min(10, "La contraseña debe tener al menos 10 caracteres.").max(72);

export async function resetEmployeePassword(id: string, password: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Usuario inválido." };
  const pw = pwSchema.safeParse(password);
  if (!pw.success) return { ok: false, error: pw.error.issues[0].message };
  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("role").eq("id", id).maybeSingle();
  if (prof?.role !== "staff") return { ok: false, error: "Solo se puede cambiar la contraseña de empleados." };
  const { error } = await admin.auth.admin.updateUserById(id, { password: pw.data });
  if (error) return { ok: false, error: "No se pudo cambiar la contraseña." };
  return { ok: true, message: "Contraseña cambiada." };
}

/** Cambia el nombre de usuario: el propio (administrador) o el de un empleado. */
export async function setUsername(id: string, raw: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Usuario inválido." };
  const u = usernameSchema.safeParse(raw);
  if (!u.success) return { ok: false, error: u.error.issues[0].message };
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", id).maybeSingle();
  if (!target || (id !== me.userId && target.role !== "staff")) return { ok: false, error: "No se puede cambiar este usuario." };
  const { data: taken } = await admin.from("profiles").select("id").eq("username", u.data).neq("id", id).maybeSingle();
  if (taken) return { ok: false, error: "Ese usuario ya existe. Elegí otro." };
  const { error } = await admin.from("profiles").update({ username: u.data }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo cambiar el usuario." };
  revalidatePath("/admin/usuarios");
  return { ok: true, message: `Usuario cambiado a «${u.data}».` };
}

/** Elimina por completo a un empleado (usuario, contraseña y dispositivos). Sus reservas, cobros y ventas quedan, sin autor asignado. */
export async function deleteEmployee(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Usuario inválido." };
  if (id === me.userId) return { ok: false, error: "No podés eliminar tu propio usuario." };
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", id).maybeSingle();
  if (!target || target.role !== "staff") return { ok: false, error: "Solo se pueden eliminar empleados." };
  // Borrar el usuario de Auth elimina en cascada su perfil y sus dispositivos de notificaciones.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    console.error("[usuarios] deleteUser", error.message);
    return { ok: false, error: "No se pudo eliminar al empleado." };
  }
  revalidatePath("/admin/usuarios");
  return { ok: true, message: "Empleado eliminado: ya no existe su usuario ni su contraseña." };
}
