import { PushToggle } from "@/components/admin/PushToggle";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { BellRing } from "lucide-react";
import { confirmationMessage, whatsappLink } from "@/business/confirmation-message";
import { requireStaff } from "@/lib/auth";
import { formatDateLong, formatDateShort, formatTime } from "@/lib/datetime";
import { getAdminVenue, listPendingInbox, listRecentlyConfirmed } from "@/queries/admin";
import { InboxCard } from "./inbox-card";

export const metadata: Metadata = { title: "Avisos" };

function ago(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

async function Inbox() {
  await connection();
  await requireStaff();
  const [pending, confirmed, venue] = await Promise.all([listPendingInbox(), listRecentlyConfirmed(), getAdminVenue()]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PushToggle />
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Avisos</h1>
        <p className="text-sm text-muted">Cada reserva nueva llega acá. Confirmala o rechazala; al confirmar podés enviarle el mensaje al cliente por WhatsApp.</p>
      </div>

      <section aria-label="Reservas por confirmar" className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <BellRing size={18} className="text-warning" /> Por confirmar ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-muted">
            No hay reservas nuevas esperando confirmación.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((b) => (
              <InboxCard
                key={b.id}
                id={b.id}
                code={b.code}
                name={b.customer_name}
                phone={b.customer_phone}
                dateLabel={formatDateShort(b.start_at)}
                timeLabel={`${formatTime(b.start_at)}–${formatTime(b.end_at)}`}
                players={b.players}
                receivedLabel={ago(b.created_at)}
              />
            ))}
          </ul>
        )}
      </section>

      {confirmed.length > 0 && (
        <section aria-label="Confirmadas recientemente" className="flex flex-col gap-3">
          <h2 className="font-semibold">Confirmadas hace poco</h2>
          <ul className="flex flex-col gap-2">
            {confirmed.map((b) => {
              const link = whatsappLink(
                b.customer_phone,
                confirmationMessage({
                  customerName: b.customer_name,
                  code: b.code,
                  dateLabel: formatDateLong(b.booking_date ?? b.start_at.slice(0, 10)),
                  startTime: formatTime(b.start_at),
                  endTime: formatTime(b.end_at),
                  players: b.players || venue.maxPlayers,
                }),
              );
              return (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <span>
                    <span className="block font-semibold">{b.customer_name}</span>
                    <span className="block text-sm text-muted">
                      {formatDateShort(b.start_at)} · {formatTime(b.start_at)}–{formatTime(b.end_at)} · {b.code}
                    </span>
                  </span>
                  {link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-lime px-3 py-2 text-sm font-semibold text-black hover:bg-lime-dark">
                      Enviar confirmación por WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs text-muted">Teléfono sin formato válido</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function AvisosPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-64 max-w-3xl animate-pulse rounded-2xl bg-surface" />}>
      <Inbox />
    </Suspense>
  );
}
