import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getVenueSettingsForm } from "@/queries/admin";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configuración" };

async function Settings() {
  await connection();
  await requireAdmin();
  const settings = await getVenueSettingsForm();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Configuración</h1>
        <p className="text-sm text-muted">Lo que cambies acá se refleja en la web pública al guardar.</p>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-64 max-w-3xl animate-pulse rounded-2xl bg-surface" />}>
      <Settings />
    </Suspense>
  );
}
