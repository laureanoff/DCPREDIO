import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { formatDateShort, formatTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { getWhatsAppStatus } from "@/services/whatsapp";
import { listNotifications } from "@/queries/admin";
import { ResendButton } from "./resend-button";

export const metadata: Metadata = { title: "Avisos" };

const STATUS = {
  sent: { label: "Enviado", cls: "border-lime-ink/40 bg-lime/15 text-lime-ink" },
  failed: { label: "No enviado", cls: "border-danger/50 bg-danger/10 text-danger" },
  pending: { label: "Pendiente", cls: "border-warning/50 bg-warning/15 text-warning" },
} as const;

async function Notifications() {
  await connection();
  const [items] = await Promise.all([listNotifications(50)]);
  const wa = getWhatsAppStatus();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Avisos de WhatsApp</h1>
        <p className="text-sm text-muted">Cada reserva nueva genera un aviso al predio. Acá ves si salió y podés reintentar los que fallaron.</p>
      </div>

      {wa.configured ? (
        <p className="rounded-2xl border border-lime-ink/40 bg-lime/10 px-4 py-3 text-sm text-lime-ink">
          WhatsApp está configurado en el servidor{wa.customerEnabled ? " (con aviso al cliente)" : ""}. El número que recibe los avisos se define en{" "}
          <Link href="/admin/configuracion" className="underline">Configuración</Link>.
        </p>
      ) : (
        <div role="alert" className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          <p className="font-semibold text-warning">WhatsApp todavía no está configurado, por eso los avisos no se envían.</p>
          <p className="mt-1 text-muted">Faltan estas variables en Vercel (Settings → Environment Variables):</p>
          <ul className="mt-1 list-inside list-disc font-mono text-xs">{wa.missing.map((m) => <li key={m}>{m}</li>)}</ul>
          <p className="mt-2 text-muted">Cuando las cargues y redeployes, usá “Reintentar” en cada aviso pendiente.</p>
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-muted">Todavía no hay avisos.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((n) => {
            const st = STATUS[n.status];
            return (
              <li key={n.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {n.recipient_type === "venue" ? "Aviso al predio" : "Aviso al cliente"}
                      {n.bookingCode && (
                        <> · <Link href={`/admin/reservas/${n.booking_id}`} className="underline-offset-2 hover:underline">{n.bookingCode}</Link></>
                      )}
                    </p>
                    <p className="text-sm text-muted">
                      {n.customerName} · {formatDateShort(n.created_at)} {formatTime(n.created_at)} · {n.attempts} {n.attempts === 1 ? "intento" : "intentos"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", st.cls)}>{st.label}</span>
                    {n.status !== "sent" && <ResendButton id={n.id} />}
                  </div>
                </div>
                {n.error && n.status !== "sent" && <p className="mt-2 text-sm text-danger">{n.error}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-64 max-w-4xl animate-pulse rounded-2xl bg-surface" />}>
      <Notifications />
    </Suspense>
  );
}
