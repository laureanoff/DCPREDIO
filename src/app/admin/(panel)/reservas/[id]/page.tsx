import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { PaymentBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { TurnAlerts } from "@/components/admin/TurnAlerts";
import { TurnTimer } from "@/components/admin/TurnTimer";
import { formatDateLong, formatTime, todayKey } from "@/lib/datetime";
import { formatMoney } from "@/lib/utils";
import { getBooking, getPayments } from "@/queries/admin";
import { BookingManager } from "./booking-manager";
import { PaymentsPanel } from "./payments-panel";

export const metadata: Metadata = { title: "Reserva" };

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [b, payments] = await Promise.all([getBooking(id), getPayments(id)]);
  if (!b) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/admin/reservas" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={16} /> Volver a reservas
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{b.code}</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">{b.customer_name}</h1>
          <p className="mt-1 text-muted">
            {formatDateLong(b.booking_date ?? todayKey())} · {formatTime(b.start_at)}–{formatTime(b.end_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/^\+?[0-9]{8,15}$/.test(b.customer_phone) && (
            <a
              href={`https://wa.me/${b.customer_phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-border px-3 py-1.5 text-sm hover:border-lime"
            >
              Escribirle por WhatsApp
            </a>
          )}
          <StatusBadge status={b.status} />
          {b.status !== "cancelled" && <PaymentBadge status={b.paymentStatus} />}
        </div>
      </header>

      {b.status !== "cancelled" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <TurnTimer startAt={b.start_at} endAt={b.end_at} large />
          <div>
            <TurnAlerts bookings={[{ id: b.id, name: b.customer_name, startAt: b.start_at, endAt: b.end_at }]} />
          </div>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Info label="Cancha" value="Completa" />
        <Info label="Jugadores" value={`${b.playersPaid} de ${b.players} pagaron`} />
        <Info label="Total" value={formatMoney(b.total_price)} />
        <Info label="Saldo" value={formatMoney(b.balance)} />
      </dl>

      {b.status === "cancelled" && b.cancel_reason && (
        <p className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">Motivo de cancelación: {b.cancel_reason}</p>
      )}

      <PaymentsPanel
        bookingId={b.id}
        total={b.total_price}
        totalPaid={b.totalPaid}
        balance={b.balance}
        players={b.players}
        cancelled={b.status === "cancelled"}
        payments={payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.method,
          notes: p.notes,
          paidAt: p.paid_at,
          isVoided: p.is_voided,
          voidReason: p.void_reason,
          playerSlot: p.player_slot,
        }))}
      />

      <BookingManager
        booking={{
          id: b.id,
          courtId: b.court_id,
          status: b.status,
          name: b.customer_name,
          phone: b.customer_phone,
          notes: b.notes ?? "",
          date: b.booking_date ?? todayKey(),
          startAt: b.start_at,
        }}
        today={todayKey()}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

export default function BookingDetailPage(props: PageProps<"/admin/reservas/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-64 max-w-3xl animate-pulse rounded-2xl bg-surface" />}>
      <Detail params={props.params} />
    </Suspense>
  );
}
