import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PaymentBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { TurnAlerts } from "@/components/admin/TurnAlerts";
import { TurnTimer } from "@/components/admin/TurnTimer";
import { addDaysKey, formatDateLong, formatTime, todayKey } from "@/lib/datetime";
import { cn, formatMoney } from "@/lib/utils";
import { getDayBookings, getPendingCount, getUpcomingCount } from "@/queries/admin";

export const metadata: Metadata = { title: "Agenda" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function Agenda({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  await connection();
  const { fecha } = await searchParams;
  const today = todayKey();
  const date = fecha && DATE_RE.test(fecha) ? fecha : today;

  const [bookings, pending, week] = await Promise.all([
    getDayBookings(date),
    getPendingCount(),
    getUpcomingCount(today, addDaysKey(today, 6)),
  ]);

  const active = bookings.filter((b) => b.status !== "cancelled");
  const players = active.reduce((sum, b) => sum + b.players, 0);
  const playersPaid = active.reduce((sum, b) => sum + b.playersPaid, 0);
  const expected = active.reduce((sum, b) => sum + b.total_price, 0);
  const collected = active.reduce((sum, b) => sum + b.totalPaid, 0);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{date === today ? "Hoy" : "Agenda del"}</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">{formatDateLong(date)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin?fecha=${addDaysKey(date, -1)}`}
            aria-label="Día anterior"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:border-lime"
          >
            <ChevronLeft size={18} />
          </Link>
          <form action="/admin" className="flex items-center gap-2">
            <input
              type="date"
              name="fecha"
              defaultValue={date}
              aria-label="Elegir fecha"
              className="h-10 rounded-xl border border-border bg-surface px-3 text-sm"
            />
            <button className="h-10 rounded-xl border border-border px-3 text-sm hover:border-lime" type="submit">Ir</button>
          </form>
          <Link
            href={`/admin?fecha=${addDaysKey(date, 1)}`}
            aria-label="Día siguiente"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:border-lime"
          >
            <ChevronRight size={18} />
          </Link>
          {date !== today && (
            <Link href="/admin" className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold leading-10 text-black">Hoy</Link>
          )}
        </div>
      </div>

      {date === today && active.length > 0 && (
        <div>
          <TurnAlerts bookings={active.map((b) => ({ id: b.id, name: b.customer_name, startAt: b.start_at, endAt: b.end_at }))} />
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Reservas del día" value={String(active.length)} />
        <Stat label="Jugadores que pagaron" value={`${playersPaid} de ${players}`} />
        <Stat label="Cobrado / a cobrar" value={`${formatMoney(collected)} / ${formatMoney(expected)}`} small />
        <Stat label="Próximos 7 días" value={String(week)} />
      </dl>

      {pending > 0 && (
        <Link
          href="/admin/avisos"
          className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning transition hover:bg-warning/20"
        >
          Hay <strong>{pending}</strong> {pending === 1 ? "reserva nueva" : "reservas nuevas"} por confirmar. Ver avisos →
        </Link>
      )}

      <section aria-label="Reservas del día" className="flex flex-col gap-3">
        {bookings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-muted">
            No hay reservas para este día.
          </p>
        ) : (
          bookings.map((b) => (
            <Link
              key={b.id}
              href={`/admin/reservas/${b.id}`}
              className={cn(
                "flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border bg-surface px-4 py-3 transition hover:border-lime",
                b.status === "cancelled" && "opacity-55",
              )}
            >
              <span className="w-24 font-[family-name:var(--font-display)] text-xl font-bold">
                {formatTime(b.start_at)}–{formatTime(b.end_at)}
              </span>
              <span className="min-w-40 flex-1">
                <span className="block font-semibold">{b.customer_name}</span>
                <span className="block text-sm text-muted">
                  {b.playersPaid} de {b.players} jugadores pagaron · {b.customer_phone}
                </span>
              </span>
              {date === today && b.status !== "cancelled" && (
                <span className="w-full sm:w-auto sm:min-w-56"><TurnTimer startAt={b.start_at} endAt={b.end_at} /></span>
              )}
              <span className="flex items-center gap-2">
                <StatusBadge status={b.status} />
                {b.status !== "cancelled" && <PaymentBadge status={b.paymentStatus} />}
              </span>
              <span className="w-24 text-right font-semibold">{formatMoney(b.total_price)}</span>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className={cn("mt-1 font-[family-name:var(--font-display)] font-bold", small ? "text-xl" : "text-3xl")}>{value}</dd>
    </div>
  );
}

export default function AdminHome(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<div className="mx-auto h-64 max-w-5xl animate-pulse rounded-2xl bg-surface" />}>
      <Agenda searchParams={props.searchParams as Promise<{ fecha?: string }>} />
    </Suspense>
  );
}
