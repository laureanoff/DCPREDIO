"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { BILLING_LABEL } from "@/lib/training";
import { whatsappLink } from "@/business/confirmation-message";
import type { DueRow } from "@/queries/training-dues";
import { addTrainingPayment } from "./actions";

type Filter = "all" | "debt" | "soon" | "ok";
const FILTERS: [Filter, string][] = [["all", "Todos"], ["debt", "Con deuda"], ["soon", "Vencen pronto"], ["ok", "Al día"]];

const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
const isDebt = (r: DueRow) => r.due.state === "overdue" || r.due.state === "classes_due" || r.due.state === "no_start";
const rank = (r: DueRow) => (r.due.state === "overdue" ? 0 - r.due.overdueDays : r.due.state === "classes_due" ? 1 : r.due.state === "no_start" ? 2 : r.due.state === "soon" ? 3 : 4);

function status(r: DueRow): { text: string; tone: string } {
  const d = r.due;
  if (d.state === "overdue") return { text: d.overdueDays === 0 ? "Cuota para cobrar hoy" : `Debe · ${d.overdueDays} ${d.overdueDays === 1 ? "día" : "días"} de atraso`, tone: "border-danger/40 bg-danger/10 text-danger" };
  if (d.state === "classes_due") return { text: `Debe ${d.classesDue} ${d.classesDue === 1 ? "clase" : "clases"}`, tone: "border-danger/40 bg-danger/10 text-danger" };
  if (d.state === "no_start") return { text: "Sin fecha de inicio", tone: "border-warning/50 bg-warning/10 text-warning" };
  if (d.state === "soon") return { text: `Vence el ${fmtDate(d.paidUntil!)}`, tone: "border-warning/50 bg-warning/10 text-warning" };
  return { text: d.paidUntil ? `Al día · hasta el ${fmtDate(d.paidUntil)}` : "Al día", tone: "border-lime/50 bg-lime/10 text-lime-ink" };
}

function Charge({ r, monthLabel }: { r: DueRow; monthLabel: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(r.due.amountDue || r.price));
  const [method, setMethod] = useState("cash");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const inp = "h-10 min-w-0 rounded-xl border border-border bg-surface-2 px-3 text-base outline-none focus:border-lime";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold text-black">Cobrar</button>;
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const x = await addTrainingPayment(r.id, { amount: Number(amount.replace(",", ".")), method: method as "cash", concept: `Cuota ${monthLabel}`, date: today, notes: "" });
          setMsg({ ok: x.ok, text: (x.ok ? x.message : x.error) ?? "" });
          if (x.ok) { setOpen(false); router.refresh(); }
        });
      }}
    >
      <input className={cn(inp, "w-28")} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Monto" required />
      <select className={inp} value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Medio de pago">
        <option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="other">Otro</option>
      </select>
      <button type="submit" disabled={pending} className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold text-black disabled:opacity-60">{pending ? "…" : "Confirmar cobro"}</button>
      <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-xl border border-border px-3 text-sm">Cancelar</button>
      {msg && !msg.ok && <span role="alert" className="text-xs text-danger">{msg.text}</span>}
    </form>
  );
}

/** Cuotas: quién está al día, quién vence pronto y quién debe, con cobro en un toque y recordatorio por WhatsApp. */
export function Dues({ rows, collectedMonth, monthLabel }: { rows: DueRow[]; collectedMonth: number; monthLabel: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const sorted = useMemo(() => [...rows].sort((a, b) => rank(a) - rank(b) || a.student.localeCompare(b.student)), [rows]);
  const debt = rows.filter(isDebt);
  const soon = rows.filter((r) => r.due.state === "soon");
  const owed = debt.reduce((t, r) => t + r.due.amountDue, 0);
  const shown = sorted.filter((r) => filter === "all" || (filter === "debt" ? isDebt(r) : filter === "soon" ? r.due.state === "soon" : !isDebt(r) && r.due.state !== "soon"));

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Cobrado en ${monthLabel}`} value={formatMoney(collectedMonth)} />
        <Stat label="Alumnos activos" value={String(rows.length)} />
        <Stat label="Con deuda" value={String(debt.length)} tone={debt.length ? "text-danger" : undefined} />
        <Stat label="Por cobrar (estimado)" value={formatMoney(owed)} tone={owed ? "text-danger" : undefined} />
      </div>
      <p className="text-xs text-muted">Se calcula con los cobros registrados: cada cobro del valor de la cuota cubre un mes (o tres, si es trimestral) desde la fecha de inicio. En «por clase», se compara lo cobrado con las clases a las que vino. {soon.length > 0 && `${soon.length} vencen en los próximos 5 días.`}</p>

      <nav aria-label="Filtrar cuotas" className="flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k} className={cn("rounded-full border px-4 py-1.5 text-sm font-medium transition", filter === k ? "border-lime bg-lime/15 text-lime-ink" : "border-border text-muted hover:text-foreground")}>{label}</button>
        ))}
      </nav>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-5 py-10 text-center text-muted">{rows.length === 0 ? "Todavía no hay alumnos activos. Aceptá una inscripción para empezar." : "No hay alumnos en este filtro."}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((r) => {
            const st = status(r);
            const wa = isDebt(r) && r.due.state !== "no_start"
              ? whatsappLink(r.phone, `Hola ${r.guardian || r.student}! Te escribimos del predio: te recordamos la cuota de ${r.student} (${r.activity}${r.due.state === "overdue" && r.due.paidUntil ? `, venció el ${fmtDate(r.due.paidUntil)}` : ""}). Podés abonarla en el predio. ¡Gracias!`)
              : null;
            return (
              <li key={r.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-40 flex-1">
                    <p className="font-semibold">{r.student}</p>
                    <p className="text-sm text-muted">{r.activity} · {BILLING_LABEL[r.billing]} {formatMoney(r.price)}{r.due.partial > 0 && ` · pagó ${formatMoney(r.due.partial)} a cuenta`}</p>
                    <p className="text-xs text-muted">Este mes: {r.presentMonth} {r.presentMonth === 1 ? "clase" : "clases"}{r.absentMonth > 0 && ` · ${r.absentMonth} ${r.absentMonth === 1 ? "falta" : "faltas"}`}</p>
                  </div>
                  <span className={cn("rounded-full border px-3 py-0.5 text-xs font-semibold", st.tone)}>{st.text}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Charge r={r} monthLabel={monthLabel} />
                  {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition hover:border-lime"><MessageCircle size={16} aria-hidden /> Recordar por WhatsApp</a>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold", tone)}>{value}</p>
    </div>
  );
}
