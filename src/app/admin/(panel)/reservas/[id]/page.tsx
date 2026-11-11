import { Suspense } from "react";
import { PanelLoading } from "@/components/ui/Loaders";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { PaymentBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { TurnAlerts } from "@/components/admin/TurnAlerts";
import { TurnControls } from "@/components/admin/TurnControls";
import { TurnTimer } from "@/components/admin/TurnTimer";
import { formatDateLong, formatTime, todayKey } from "@/lib/datetime";
import { formatMoney } from "@/lib/utils";
import { confirmationMessage, whatsappLink } from "@/business/confirmation-message";
import { getAdminVenue, getBooking, getPayments } from "@/queries/admin";
import { getStaff } from "@/lib/auth";
import { DeleteCancelled } from "../delete-cancelled";
import { BookingManager } from "./booking-manager";
import { PaymentsPanel } from "./payments-panel";

export const metadata: Metadata = { title: "Reserva" };

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [b, payments, venue, staff] = await Promise.all([getBooking(id), getPayments(id), getAdminVenue(), getStaff()]);
  if (!b) notFound();
  const waLink = whatsappLink(
    b.customer_phone,
    confirmationMessage({
      customerName: b.customer_name,
      code: b.code,
      dateLabel: formatDateLong(b.booking_date ?? todayKey()),
      startTime: formatTime(b.start_at),
      endTime: formatTime(b.end_at),
      players: b.players || venue.maxPlayers,
    }),
  );

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
          {waLink && b.status !== "cancelled" && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-lime px-3 py-1.5 text-sm font-semibold text-black hover:brightness-110"
            >
              Enviar confirmación por WhatsApp
            </a>
          )}
          <StatusBadge status={b.status} />
          {b.status !== "cancelled" && <PaymentBadge status={b.paymentStatus} />}
        </div>
      </header>

      {b.status !== "cancelled" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <TurnTimer startAt={b.start_at} endAt={b.end_at} startedAt={b.started_at} finishedAt={b.finished_at} large />
          {b.status !== "pending" && <TurnControls id={b.id} startedAt={b.started_at} finishedAt={b.finished_at} />}
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

      {b.status === "cancelled" && staff?.role === "admin" && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-1 font-semibold">Eliminar reserva</h2>
          {payments.length === 0 ? (
            <>
              <p className="mb-3 text-sm text-muted">Está cancelada y sin pagos: se puede borrar definitivamente.</p>
              <DeleteCancelled ids={[b.id]} label="Eliminar esta reserva" redirectTo="/admin/reservas?estado=cancelled" />
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted">
                Tiene {payments.length} {payments.length === 1 ? "pago registrado" : "pagos registrados"}
                {payments.some((p) => !p.is_voided) ? ` (${formatMoney(payments.filter((p) => !p.is_voided).reduce((t, p) => t + Number(p.amount), 0))} sin anular)` : " (todos anulados)"}.
                Si la eliminás, esos pagos también se borran y dejan de contarse en las estadísticas. Útil si marcaste un pago por error.
              </p>
              <DeleteCancelled
                ids={[b.id]}
                includePaid
                label="Eliminar reserva y sus pagos"
                warning="Se borran la reserva y sus pagos, para siempre."
                redirectTo="/admin/reservas?estado=cancelled"
              />
            </>
          )}
        </section>
      )}
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
    <Suspense fallback={<PanelLoading />}>
      <Detail params={props.params} />
    </Suspense>
  );
}
