"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerPayment, voidPayment } from "../payment-actions";
import type { ActionResult } from "../actions";
import { formatDateShort, formatTime } from "@/lib/datetime";
import { cn, formatMoney } from "@/lib/utils";

export type PaymentItem = {
  id: string;
  amount: number;
  method: "cash" | "transfer" | "other";
  notes: string | null;
  paidAt: string;
  isVoided: boolean;
  voidReason: string | null;
};

type Props = { bookingId: string; total: number; totalPaid: number; balance: number; cancelled: boolean; payments: PaymentItem[] };

const METHODS = { cash: "Efectivo", transfer: "Transferencia", other: "Otro" } as const;
const field = "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";

export function PaymentsPanel({ bookingId, total, totalPaid, balance, cancelled, payments }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : "");
  const [method, setMethod] = useState<"cash" | "transfer" | "other">("cash");
  const [notes, setNotes] = useState("");
  const [voiding, setVoiding] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function run(action: () => Promise<ActionResult>, after?: () => void) {
    setMsg(null);
    start(async () => {
      const r = await action();
      setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  }

  const pct = total > 0 ? Math.min(100, Math.round((totalPaid / total) * 100)) : 0;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold uppercase">Pagos</h2>

      <div className="mb-4">
        <div className="mb-1 flex justify-between text-sm">
          <span>Cobrado {formatMoney(totalPaid)} de {formatMoney(total)}</span>
          <span className={cn("font-semibold", balance > 0 ? "text-warning" : "text-lime-ink")}>
            {balance > 0 ? `Saldo ${formatMoney(balance)}` : "Saldada"}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Porcentaje cobrado">
          <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={cn("mb-3 rounded-xl border px-3 py-2 text-sm", msg.ok ? "border-lime-ink/40 bg-lime/10 text-lime-ink" : "border-danger/50 bg-danger/10 text-danger")}>
          {msg.text}
        </p>
      )}

      {!cancelled && balance > 0 && (
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const value = Number(amount.replace(",", "."));
            run(() => registerPayment(bookingId, { amount: value, method, notes }), () => {
              setNotes("");
              setAmount("");
            });
          }}
        >
          <label className="flex flex-col gap-1 text-sm">Monto
            <input className={field} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required />
          </label>
          <label className="flex flex-col gap-1 text-sm">Medio
            <select className={field} value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
              {Object.entries(METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">Nota (opcional)
            <input className={field} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" disabled={pending} className="h-11 rounded-xl bg-lime px-5 text-sm font-bold uppercase tracking-wide text-black disabled:opacity-50">
              Registrar
            </button>
          </div>
          <div className="sm:col-span-4">
            <button type="button" className="text-sm text-lime-ink underline-offset-2 hover:underline" onClick={() => setAmount(String(balance))}>
              Completar con el saldo ({formatMoney(balance)})
            </button>
          </div>
        </form>
      )}

      <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-muted">Historial</h3>
      {payments.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay pagos registrados.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {payments.map((p) => (
            <li key={p.id} className={cn("rounded-xl border border-border px-3 py-2", p.isVoided && "opacity-60")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className={cn("font-semibold", p.isVoided && "line-through")}>{formatMoney(p.amount)}</span>
                  <span className="ml-2 text-sm text-muted">{METHODS[p.method]} · {formatDateShort(p.paidAt)} {formatTime(p.paidAt)}</span>
                  {p.isVoided && <span className="ml-2 rounded-full border border-danger/50 px-2 py-0.5 text-xs text-danger">Anulado</span>}
                </div>
                {!p.isVoided && voiding !== p.id && (
                  <button className="text-sm text-danger hover:underline" onClick={() => { setVoiding(p.id); setReason(""); }}>Anular</button>
                )}
              </div>
              {(p.notes || p.voidReason) && (
                <p className="mt-1 text-sm text-muted">{p.notes}{p.voidReason ? ` · Motivo de anulación: ${p.voidReason}` : ""}</p>
              )}
              {voiding === p.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input className={cn(field, "h-10 flex-1")} placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
                  <button className="h-10 rounded-xl bg-danger px-4 text-sm font-bold text-white disabled:opacity-50" disabled={pending} onClick={() => run(() => voidPayment(p.id, reason), () => setVoiding(null))}>
                    Confirmar anulación
                  </button>
                  <button className="h-10 rounded-xl border border-border px-4 text-sm" onClick={() => setVoiding(null)}>Volver</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
