import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/datetime";
import { NewBookingForm } from "./new-booking-form";

export const metadata: Metadata = { title: "Nueva reserva" };

async function Content({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  await connection();
  await requireStaff();
  const { fecha } = await searchParams;
  const supabase = await createClient();
  const { data: courts } = await supabase.from("courts").select("id, name").eq("is_active", true).order("sort_order").order("created_at");
  const { data: settings } = await supabase.from("venue_settings").select("price_group").eq("id", 1).single();
  const today = todayKey();
  const initial = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha >= today ? fecha : today;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link href="/admin/reservas" className="text-sm text-muted hover:text-foreground">← Reservas</Link>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Nueva reserva</h1>
      <p className="text-sm text-muted">Para cargar pedidos que llegan por teléfono o WhatsApp. El turno queda bloqueado igual que una reserva de la web.</p>
      <NewBookingForm courts={courts ?? []} today={today} initialDate={initial} slotPrice={Number(settings?.price_group ?? 0)} />
    </div>
  );
}

export default function Page(props: PageProps<"/admin/reservas/nueva">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
