import { Suspense } from "react";
import { PanelLoading } from "@/components/ui/Loaders";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { IncomeChart, type ChartBar } from "@/components/admin/IncomeChart";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { daysInMonth, dateKey, monthLabel, todayKey } from "@/lib/datetime";
import { formatMoney } from "@/lib/utils";
import { getIncome } from "@/queries/admin";

export const metadata: Metadata = { title: "Estadísticas" };

type Params = { anio?: string; mes?: string; medio?: string };
type Method = "cash" | "transfer" | "other";
const METHODS: { value: "" | Method; label: string }[] = [
  { value: "", label: "Todos los medios" },
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia" },
  { value: "other", label: "Otro" },
];

const shortMonth = (m: number) =>
  new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", month: "short" }).format(new Date(Date.UTC(2000, m - 1, 1))).replace(".", "");

async function Stats({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  await requireAdmin();
  const p = await searchParams;

  const currentYear = Number(todayKey().slice(0, 4));
  const year = Math.min(currentYear + 1, Math.max(2020, Number.parseInt(p.anio ?? "", 10) || currentYear));
  const monthNum = Number.parseInt(p.mes ?? "", 10);
  const month = monthNum >= 1 && monthNum <= 12 ? monthNum : null;
  const method = METHODS.some((m) => m.value && m.value === p.medio) ? (p.medio as Method) : undefined;

  const qs = (over: Params) => {
    const sp = new URLSearchParams();
    const merged: Params = { anio: String(year), mes: month ? String(month) : undefined, medio: method, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    return `/admin/estadisticas?${sp.toString()}`;
  };

  let bars: ChartBar[];
  let rows;
  if (month) {
    const last = daysInMonth(year, month);
    rows = await getIncome({ from: dateKey(year, month, 1), to: dateKey(year, month, last), group: "day", method });
    const byDay = new Map(rows.map((r) => [r.bucket, r]));
    bars = Array.from({ length: last }, (_, i) => {
      const key = dateKey(year, month, i + 1);
      const r = byDay.get(key);
      return { key, label: `${i + 1} de ${monthLabel(year, month).split(" ")[0].toLowerCase()}`, value: r?.total ?? 0, count: r?.payments ?? 0 };
    });
  } else {
    rows = await getIncome({ from: dateKey(year, 1, 1), to: dateKey(year, 12, 31), group: "month", method });
    const byMonth = new Map(rows.map((r) => [r.bucket.slice(0, 7), r]));
    bars = Array.from({ length: 12 }, (_, i) => {
      const r = byMonth.get(`${year}-${String(i + 1).padStart(2, "0")}`);
      return {
        key: String(i + 1),
        label: `${shortMonth(i + 1)} ${year}`,
        value: r?.total ?? 0,
        count: r?.payments ?? 0,
        href: qs({ mes: String(i + 1) }),
      };
    });
  }

  const from = month ? dateKey(year, month, 1) : dateKey(year, 1, 1);
  const to = month ? dateKey(year, month, daysInMonth(year, month)) : dateKey(year, 12, 31);
  const supabase = await createClient();
  const [buffetSum, buffetTop] = await Promise.all([
    supabase.rpc("buffet_summary", { p_from: from, p_to: to }),
    supabase.rpc("buffet_top_products", { p_from: from, p_to: to }),
  ]);
  const nextDay = new Date(`${to}T00:00:00-03:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  let tq = supabase
    .from("training_payments")
    .select("amount, method, training_enrollments(activity_name, training_students(full_name))")
    .eq("is_voided", false)
    .gte("paid_at", `${from}T00:00:00-03:00`)
    .lt("paid_at", nextDay.toISOString())
    .limit(5000);
  if (method) tq = tq.eq("method", method);
  const trainingPays = (await tq).data ?? [];
  const tAgg = { total: 0, count: trainingPays.length, byActivity: new Map<string, number>(), byStudent: new Map<string, number>(), byMethod: new Map<string, number>() };
  for (const x of trainingPays) {
    const amount = Number(x.amount);
    const enr = Array.isArray(x.training_enrollments) ? x.training_enrollments[0] : x.training_enrollments;
    const stu = enr ? (Array.isArray(enr.training_students) ? enr.training_students[0] : enr.training_students) : null;
    tAgg.total += amount;
    tAgg.byActivity.set(enr?.activity_name ?? "—", (tAgg.byActivity.get(enr?.activity_name ?? "—") ?? 0) + amount);
    tAgg.byStudent.set(stu?.full_name ?? "—", (tAgg.byStudent.get(stu?.full_name ?? "—") ?? 0) + amount);
    tAgg.byMethod.set(x.method, (tAgg.byMethod.get(x.method) ?? 0) + amount);
  }
  const top = (m: Map<string, number>, n = 8) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const METHOD_LABEL: Record<string, string> = { cash: "Efectivo", transfer: "Transferencia", other: "Otro" };
  const buffet = buffetSum.data?.[0];
  const topProducts = (buffetTop.data ?? []).slice(0, 5);

  const total = bars.reduce((s, b) => s + b.value, 0);
  const count = bars.reduce((s, b) => s + b.count, 0);
  const periods = bars.filter((b) => b.value > 0).length;
  const years = Array.from(new Set([year, currentYear, currentYear - 1, currentYear - 2])).sort((a, b) => b - a);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Estadísticas</h1>
        <p className="text-sm text-muted">Ingresos según la fecha en que se cobró cada pago, no la fecha del turno. Los pagos anulados no cuentan.</p>
      </div>

      <form action="/admin/estadisticas" className="flex flex-wrap items-center gap-2">
        <select name="anio" defaultValue={year} aria-label="Año" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select name="mes" defaultValue={month ?? ""} aria-label="Mes" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm">
          <option value="">Todo el año</option>
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{monthLabel(2000, i + 1).split(" ")[0]}</option>)}
        </select>
        <select name="medio" defaultValue={method ?? ""} aria-label="Medio de pago" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm">
          {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <button type="submit" className="h-11 rounded-xl bg-lime px-5 text-sm font-semibold text-black">Aplicar</button>
        {month && <Link href={qs({ mes: undefined })} className="flex h-11 items-center rounded-xl border border-border px-4 text-sm text-muted hover:text-foreground">← Ver todo el año</Link>}
      </form>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile label={month ? `Cobrado en ${monthLabel(year, month)}` : `Cobrado en ${year}`} value={formatMoney(total)} />
        <Tile label="Cantidad de cobros" value={String(count)} />
        <Tile label={month ? "Promedio por día con cobros" : "Promedio por mes con cobros"} value={formatMoney(periods ? Math.round(total / periods) : 0)} />
      </dl>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase">Buffet · {month ? monthLabel(year, month) : year}</h2>
        <p className="mt-1 text-2xl font-bold">{formatMoney(Number(buffet?.total ?? 0))} <span className="text-sm font-normal text-muted">· {Number(buffet?.sales ?? 0)} ventas (aparte de los cobros de canchas)</span></p>
        {topProducts.length > 0 && (
          <ol className="mt-2 list-decimal pl-5 text-sm text-muted">
            {topProducts.map((t) => <li key={t.product_name}>{t.product_name}: {Number(t.quantity)} u. · {formatMoney(Number(t.total))}</li>)}
          </ol>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase">Entrenamientos · {month ? monthLabel(year, month) : year}</h2>
        <p className="mt-1 text-2xl font-bold">
          {formatMoney(tAgg.total)} <span className="text-sm font-normal text-muted">· {tAgg.count} {tAgg.count === 1 ? "cobro" : "cobros"} de alumnos (aparte de los cobros de canchas)</span>
        </p>
        {tAgg.count === 0 ? (
          <p className="mt-2 text-sm text-muted">No hay cobros de entrenamientos en este período.</p>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            <Breakdown title="Por actividad" rows={top(tAgg.byActivity)} total={tAgg.total} />
            <Breakdown title="Por alumno" rows={top(tAgg.byStudent)} total={tAgg.total} />
            <Breakdown title="Por medio de pago" rows={top(tAgg.byMethod).map(([k, v]) => [METHOD_LABEL[k] ?? k, v] as [string, number])} total={tAgg.total} />
          </div>
        )}
      </section>

      {count === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-muted">No hay cobros registrados en este período.</p>
      ) : (
        <IncomeChart
          bars={bars}
          title={month ? `Ingresos por día · ${monthLabel(year, month)}` : `Ingresos por mes · ${year}`}
          unitLabel={month ? "Pesos argentinos (ARS) por día." : "Pesos argentinos (ARS) por mes. Tocá una barra para ver el detalle por día."}
        />
      )}
    </div>
  );
}

function Breakdown({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <ul className="flex flex-col gap-2">
        {rows.map(([name, value]) => (
          <li key={name} className="text-sm">
            <div className="flex justify-between gap-2"><span className="truncate">{name}</span><strong>{formatMoney(value)}</strong></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden><div className="h-full rounded-full bg-lime" style={{ width: `${total ? Math.max(3, (value / total) * 100) : 0}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold">{value}</dd>
    </div>
  );
}

export default function StatsPage(props: PageProps<"/admin/estadisticas">) {
  return (
    <Suspense fallback={<PanelLoading />}>
      <Stats searchParams={props.searchParams as Promise<Params>} />
    </Suspense>
  );
}
