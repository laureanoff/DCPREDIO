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
  DC024: "No hay stock suficiente de algún producto. Actualizá la pantalla.",
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

/** Borra definitivamente una venta (solo administrador). Para corregir un error sin dejar rastro; si querés conservar el registro, usá «Anular». */
export async function deleteSale(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Venta inválida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_buffet_sale", { p_id: id });
  if (error) return { ok: false, error: (error.code && ERR[error.code]) || "No se pudo borrar la venta." };
  revalidatePath("/admin/buffet");
  return { ok: true, message: "Venta borrada." };
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

const updateSchema = productSchema.extend({
  active: z.boolean(),
  track: z.boolean(),
  stock: z.number().int().min(0).max(1_000_000),
  low: z.number().int().min(0).max(100_000),
});

export async function updateProduct(id: string, raw: z.input<typeof updateSchema>): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Producto inválido." };
  const p = updateSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const v = p.data;
  const supabase = await createClient();
  const { data: cur } = await supabase.from("buffet_products").select("stock, track_stock").eq("id", id).maybeSingle();
  if (!cur) return { ok: false, error: "El producto no existe." };

  const { error } = await supabase
    .from("buffet_products")
    .update({ name: v.name, price: v.price, is_active: v.active, track_stock: v.track, low_stock_threshold: v.low })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo guardar el producto." };

  // El stock se corrige con una resta/suma atómica (no pisa ventas que entren al mismo tiempo).
  if (v.track) {
    const base = cur.track_stock ? cur.stock : 0;
    const delta = v.stock - base;
    if (delta !== 0) {
      const { error: e2 } = await supabase.rpc("adjust_buffet_stock", { p_id: id, p_delta: delta });
      if (e2) return { ok: false, error: (e2.code && ERR[e2.code]) || "Se guardó el producto, pero no se pudo ajustar el stock." };
    }
  }
  revalidatePath("/admin/buffet");
  return { ok: true, message: "Producto guardado." };
}

/** Suma stock (reposición) — también para empleados. */
export async function restock(id: string, qty: number): Promise<ActionResult> {
  await requireStaff();
  if (!idSchema.safeParse(id).success || !Number.isInteger(qty) || qty < 1 || qty > 100000) return { ok: false, error: "Cantidad inválida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("adjust_buffet_stock", { p_id: id, p_delta: qty });
  if (error) return { ok: false, error: (error.code && ERR[error.code]) || "No se pudo reponer." };
  revalidatePath("/admin/buffet");
  return { ok: true, message: `Stock repuesto (+${qty}).` };
}

const COMMON = [
  "Agua 500ml", "Agua saborizada", "Gaseosa 500ml", "Gaseosa 1,5L", "Gatorade", "Cerveza lata", "Cerveza litro", "Fernet con coca",
  "Energizante", "Café", "Papas fritas", "Maní", "Alfajor", "Hamburguesa", "Pizza porción", "Sándwich", "Empanada", "Hielo",
];

/** Carga productos comunes de buffet (sin precio: el admin los completa). No duplica los que ya existen. */
export async function addCommonProducts(): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("buffet_products").select("name, sort_order");
  const names = new Set((existing ?? []).map((e) => e.name.toLowerCase()));
  let order = Math.max(0, ...(existing ?? []).map((e) => e.sort_order));
  const rows = COMMON.filter((n) => !names.has(n.toLowerCase())).map((name) => ({ name, price: 0, sort_order: ++order }));
  if (rows.length === 0) return { ok: true, message: "Ya tenés todos los productos comunes cargados." };
  const { error } = await supabase.from("buffet_products").insert(rows);
  if (error) return { ok: false, error: "No se pudieron cargar los productos." };
  revalidatePath("/admin/buffet");
  return { ok: true, message: `${rows.length} productos agregados. Poné el precio de cada uno para poder venderlos y borrá o desactivá los que no uses.` };
}
