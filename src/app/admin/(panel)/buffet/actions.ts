"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../reservas/actions";

const idSchema = z.string().uuid();
const ERR: Record<string, string> = {
  DC020: "Agregá al menos un producto.",
  DC021: "La reserva indicada no existe.",
  DC022: "Algún producto ya no está disponible. Actualizá la pantalla.",
  DC023: "La venta no existe.",
  "42501": "No tenés permiso para anular esta venta (los empleados solo pueden anular las suyas dentro de las 2 horas).",
};

const saleSchema = z.object({
  items: z.array(z.object({ productId: idSchema, quantity: z.number().int().min(1).max(999) })).min(1).max(50),
  method: z.enum(["cash", "transfer", "other"]),
  note: z.string().trim().max(200),
});

/** Registra una venta. El precio sale de la base, nunca del navegador. */
export async function createSale(raw: z.input<typeof saleSchema>): Promise<ActionResult> {
  await requireStaff();
  const p = saleSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Revisá los productos de la venta." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_buffet_sale", {
    p_items: p.data.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    p_method: p.data.method,
    p_note: p.data.note || undefined,
  });
  if (error || !data) {
    if (!error?.code || !ERR[error.code]) console.error("[buffet] venta", error?.code, error?.message);
    return { ok: false, error: (error?.code && ERR[error.code]) || "No se pudo registrar la venta." };
  }
  revalidatePath("/admin/buffet");
  return { ok: true, message: `Venta registrada: $${Number(data.total).toLocaleString("es-AR")}.` };
}

export async function voidSale(id: string, reason: string): Promise<ActionResult> {
  await requireStaff();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Venta inválida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("void_buffet_sale", { p_id: id, p_reason: reason.trim().slice(0, 300) || undefined });
  if (error) return { ok: false, error: (error.code && ERR[error.code]) || "No se pudo anular la venta." };
  revalidatePath("/admin/buffet");
  return { ok: true, message: "Venta anulada." };
}

const productSchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre.").max(80),
  price: z.number().min(0, "El precio no puede ser negativo.").max(10_000_000),
});

export async function addProduct(raw: z.input<typeof productSchema>): Promise<ActionResult> {
  await requireAdmin();
  const p = productSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const supabase = await createClient();
  const { data: last } = await supabase.from("buffet_products").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("buffet_products").insert({ name: p.data.name, price: p.data.price, sort_order: (last?.sort_order ?? 0) + 1 });
  if (error) return { ok: false, error: "No se pudo agregar el producto." };
  revalidatePath("/admin/buffet");
  return { ok: true, message: "Producto agregado." };
}

export async function updateProduct(id: string, raw: z.input<typeof productSchema> & { active: boolean }): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Producto inválido." };
  const p = productSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("buffet_products").update({ name: p.data.name, price: p.data.price, is_active: !!raw.active }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: "No se pudo guardar el producto." };
  revalidatePath("/admin/buffet");
  return { ok: true, message: "Producto guardado." };
}
