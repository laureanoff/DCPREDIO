import { Suspense } from "react";
import { PanelLoading } from "@/components/ui/Loaders";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getVenueSettingsForm } from "@/queries/admin";
import { CourtsManager } from "./courts-manager";
import { SettingsForm } from "./settings-form";
import { TrainingManager, type ActivityRow } from "./training-manager";
import type { Billing } from "@/lib/training";

export const metadata: Metadata = { title: "Configuración" };

async function Settings() {
  await connection();
  await requireAdmin();
  const supabase = await createClient();
  const [settings, courts, acts, packs, prices] = await Promise.all([
    getVenueSettingsForm(),
    supabase.from("courts").select("id, name, is_active").order("sort_order").order("created_at"),
    supabase.from("training_activities").select("id, name, description, location, is_active").order("sort_order").order("created_at"),
    supabase.from("training_packs").select("id, activity_id, name, description, days_per_week, is_active").order("sort_order").order("days_per_week"),
    supabase.from("training_pack_prices").select("pack_id, billing, price"),
  ]);
  const activities: ActivityRow[] = (acts.data ?? []).map((a) => ({
    id: a.id, name: a.name, description: a.description ?? "", location: a.location ?? "", isActive: a.is_active,
    packs: (packs.data ?? []).filter((p) => p.activity_id === a.id).map((p) => ({
      id: p.id, name: p.name, description: p.description ?? "", daysPerWeek: p.days_per_week, isActive: p.is_active,
      prices: Object.fromEntries((prices.data ?? []).filter((x) => x.pack_id === p.id).map((x) => [x.billing, Number(x.price)])) as Partial<Record<Billing, number>>,
    })),
  }));
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Configuración</h1>
        <p className="text-sm text-muted">Lo que cambies acá se refleja en la web pública al guardar.</p>
      </div>
      <CourtsManager courts={(courts.data ?? []).map((c) => ({ id: c.id, name: c.name, isActive: c.is_active }))} />
      <TrainingManager activities={activities} />
      <SettingsForm initial={settings} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<PanelLoading />}>
      <Settings />
    </Suspense>
  );
}
