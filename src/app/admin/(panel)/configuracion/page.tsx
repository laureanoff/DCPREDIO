import { Suspense } from "react";
import { PanelLoading } from "@/components/ui/Loaders";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getVenueSettingsForm } from "@/queries/admin";
import { CourtsManager } from "./courts-manager";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configuración" };

async function Settings() {
  await connection();
  await requireAdmin();
  const supabase = await createClient();
  const [settings, courts] = await Promise.all([
    getVenueSettingsForm(),
    supabase.from("courts").select("id, name, is_active").order("sort_order").order("created_at"),
  ]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Configuración</h1>
        <p className="text-sm text-muted">Lo que cambies acá se refleja en la web pública al guardar.</p>
      </div>
      <CourtsManager courts={(courts.data ?? []).map((c) => ({ id: c.id, name: c.name, isActive: c.is_active }))} />
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
