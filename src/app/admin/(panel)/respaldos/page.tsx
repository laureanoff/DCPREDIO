import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { DATASETS } from "@/queries/backup";

export const metadata: Metadata = { title: "Respaldos" };

async function Backups() {
  await connection();
  await requireAdmin();
  const link = "rounded-xl border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-lime";
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Respaldos</h1>
        <p className="text-sm text-muted">Descargá una copia de tus datos cuando quieras. Los archivos contienen datos personales de clientes: guardalos en un lugar seguro.</p>
      </div>

      <section className="rounded-2xl border border-lime-ink/40 bg-lime/10 p-4">
        <h2 className="font-semibold">Respaldo completo</h2>
        <p className="mb-3 text-sm text-muted">Reservas, pagos, avisos, configuración y horarios en un solo archivo.</p>
        <a className={link} href="/admin/respaldos/export?tabla=todo&formato=json" download>Descargar JSON completo</a>
      </section>

      <ul className="flex flex-col gap-3">
        {Object.entries(DATASETS).map(([key, d]) => (
          <li key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
            <span className="font-medium">{d.label}</span>
            <span className="flex gap-2">
              <a className={link} href={`/admin/respaldos/export?tabla=${key}&formato=csv`} download>CSV (Excel)</a>
              <a className={link} href={`/admin/respaldos/export?tabla=${key}&formato=json`} download>JSON</a>
            </span>
          </li>
        ))}
      </ul>

      <section className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
        <h2 className="mb-1 font-semibold text-foreground">Respaldos automáticos de la base</h2>
        <p>Supabase hace copias diarias propias según tu plan (en el plan gratuito no incluye restauración a un punto en el tiempo). Para tener un respaldo propio, descargá el JSON completo de forma periódica.</p>
      </section>
    </div>
  );
}

export default function BackupsPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-64 max-w-3xl animate-pulse rounded-2xl bg-surface" />}>
      <Backups />
    </Suspense>
  );
}
