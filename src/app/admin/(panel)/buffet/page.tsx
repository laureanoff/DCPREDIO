import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getStaff, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/datetime";
import { BuffetUI } from "./buffet-ui";

export const metadata: Metadata = { title: "Buffet" };

async function Content() {
  await connection();
  await requireStaff();
  const staff = await getStaff();
  const supabase = await createClient();
  const today = todayKey();

  const [products, sales, summary] = await Promise.all([
    supabase.from("buffet_products").select("id, name, price, is_active, track_stock, stock, low_stock_threshold").order("sort_order").order("created_at"),
    supabase
      .from("buffet_sales")
      .select("id, total, method, note, is_voided, created_at, created_by, buffet_sale_items(product_name, quantity)")
      .gte("created_at", `${today}T00:00:00-03:00`)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.rpc("buffet_summary", { p_from: today, p_to: today }),
  ]);
  const s = summary.data?.[0];

  return (
    <BuffetUI
      isAdmin={staff?.role === "admin"}
      userId={staff?.userId ?? ""}
      products={(products.data ?? []).map((p) => ({ id: p.id, name: p.name, price: Number(p.price), active: p.is_active, track: p.track_stock, stock: p.stock, low: p.low_stock_threshold }))}
      sales={(sales.data ?? []).map((x) => ({
        id: x.id,
        total: Number(x.total),
        method: x.method,
        note: x.note ?? "",
        voided: x.is_voided,
        at: x.created_at,
        mine: x.created_by === staff?.userId,
        items: (x.buffet_sale_items ?? []).map((i) => `${i.quantity}× ${i.product_name}`).join(", "),
      }))}
      summary={{ count: Number(s?.sales ?? 0), total: Number(s?.total ?? 0), cash: Number(s?.cash ?? 0), transfer: Number(s?.transfer ?? 0), other: Number(s?.other ?? 0) }}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Content />
    </Suspense>
  );
}
