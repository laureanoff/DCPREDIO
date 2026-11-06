import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { DeleteCancelled } from "./delete-cancelled";
import { PaymentBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { formatDateShort, formatTime } from "@/lib/datetime";
import { cn, formatMoney } from "@/lib/utils";
import { getStaff } from "@/lib/auth";
import { listBookings, PAGE_SIZE, type BookingFilters } from "@/queries/admin";

export const metadata: Metadata = { title: "Reservas" };

type Params = { vista?: string; estado?: string; fecha?: string; q?: string; pagina?: string };

const VIEWS: { value: BookingFilters["view"]; label: string }[] = [
  { value: "upcoming", label: "Próximas" },
  { value: "past", label: "Pasadas" },
  { value: "all", label: "Todas" },
];
const STATUSES = [
  { value: "", label: "Todos los estados" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
];

function parse(p: Params): BookingFilters {
  const view = VIEWS.some((v) => v.value === p.vista) ? (p.vista as BookingFilters["view"]) : "upcoming";
  const status = ["pending", "confirmed", "completed", "cancelled"].includes(p.estado ?? "")
    ? (p.estado as BookingFilters["status"])
    : undefined;
  const date = p.fecha && /^\d{4}-\d{2}-\d{2}$/.test(p.fecha) ? p.fecha : undefined;
  const page = Math.max(1, Number.parseInt(p.pagina ?? "1", 10) || 1);
  return { view, status, date, q: p.q?.slice(0, 60), page };
}

function href(f: BookingFilters, over: Partial<Params>) {
  const sp = new URLSearchParams();
  const merged: Params = { vista: f.view, estado: f.status, fecha: f.date, q: f.q, pagina: String(f.page), ...over };
  for (const [k, v] of Object.entries(merged)) if (v && !(k === "pagina" && v === "1")) sp.set(k, v);
  const qs = sp.toString();
  return `/admin/reservas${qs ? `?${qs}` : ""}`;
}

async function Bookings({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const f = parse(await searchParams);
  const [{ rows, total }, staff] = await Promise.all([listBookings(f), getStaff()]);
  const isAdmin = staff?.role === "admin";
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Reservas</h1>

      <div className="flex gap-1 rounded-xl border border-border bg-surface p-1 self-start">
        {VIEWS.map((v) => (
          <Link
            key={v.value}
            href={href(f, { vista: v.value, pagina: "1", fecha: undefined })}
            className={cn("rounded-lg px-4 py-1.5 text-sm font-medium", f.view === v.value && !f.date ? "bg-lime text-black" : "text-muted hover:text-foreground")}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <form action="/admin/reservas" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <input type="hidden" name="vista" value={f.view} />
        <input
          name="q"
          defaultValue={f.q}
          placeholder="Buscar por nombre, teléfono o código"
          aria-label="Buscar"
          className="h-11 rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-lime"
        />
        <select name="estado" defaultValue={f.status ?? ""} aria-label="Estado" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm">
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input type="date" name="fecha" defaultValue={f.date} aria-label="Fecha" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm" />
        <div className="flex gap-2">
          <button type="submit" className="h-11 flex-1 rounded-xl bg-lime px-5 text-sm font-semibold text-black">Filtrar</button>
          <Link href="/admin/reservas" className="flex h-11 items-center rounded-xl border border-border px-4 text-sm text-muted hover:text-foreground">Limpiar</Link>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{total} {total === 1 ? "reserva" : "reservas"}</p>
        {isAdmin && f.status === "cancelled" && total > 0 && (
          <div className="flex flex-wrap gap-2">
            <DeleteCancelled label="Eliminar canceladas sin pagos" />
            <DeleteCancelled
              includePaid
              label="Eliminar todas (incluso con pagos)"
              warning="Se borran las reservas canceladas Y sus pagos registrados, para siempre."
            />
          </div>
        )}
      </div>
      {isAdmin && f.status === "cancelled" && (
        <p className="-mt-3 text-xs text-muted">Las canceladas con pagos solo se borran con la opción «incluso con pagos»: esos pagos dejan de contarse en las estadísticas.</p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-muted">No hay reservas con esos filtros.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((b) => (
            <li key={b.id}>
              <Link
                href={`/admin/reservas/${b.id}`}
                className={cn(
                  "flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border bg-surface px-4 py-3 transition hover:border-lime",
                  b.status === "cancelled" && "opacity-55",
                )}
              >
                <span className="w-32">
                  <span className="block font-semibold">{formatDateShort(b.start_at)}</span>
                  <span className="block text-sm text-muted">{formatTime(b.start_at)}–{formatTime(b.end_at)}</span>
                </span>
                <span className="min-w-40 flex-1">
                  <span className="block font-semibold">{b.customer_name}</span>
                  <span className="block text-sm text-muted">
                    {b.code} · {b.playersPaid} de {b.players} jugadores pagaron
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={b.status} />
                  {b.status !== "cancelled" && <PaymentBadge status={b.paymentStatus} />}
                </span>
                <span className="w-24 text-right font-semibold">{formatMoney(b.total_price)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Paginación">
          {f.page > 1 ? <Link className="rounded-xl border border-border px-4 py-2 hover:border-lime" href={href(f, { pagina: String(f.page - 1) })}>← Anterior</Link> : <span />}
          <span className="text-muted">Página {f.page} de {pages}</span>
          {f.page < pages ? <Link className="rounded-xl border border-border px-4 py-2 hover:border-lime" href={href(f, { pagina: String(f.page + 1) })}>Siguiente →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}

export default function BookingsPage(props: PageProps<"/admin/reservas">) {
  return (
    <Suspense fallback={<div className="mx-auto h-64 max-w-5xl animate-pulse rounded-2xl bg-surface" />}>
      <Bookings searchParams={props.searchParams as Promise<Params>} />
    </Suspense>
  );
}
