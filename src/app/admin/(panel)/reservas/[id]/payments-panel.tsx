"use client";

import { playGoal } from "@/lib/sfx";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PitchLegend, PlayersPitch, TEAM_A, TEAM_B } from "./players-pitch";
import { registerPayment, registerPlayerPayment, voidPayment } from "../payment-actions";
import type { ActionResult } from "../actions";
import { playerShare } from "@/business/payments";
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
  playerSlot: number | null;
};

type Props = {
  bookingId: string;
  total: number;
  totalPaid: number;
  balance: number;
  players: number;
  cancelled: boolean;
  payments: PaymentItem[];
};

type Method = "cash" | "transfer" | "other";
const METHODS: Record<Method, string> = { cash: "Efectivo", transfer: "Transferencia", other: "Otro" };
const field = "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";

export function PaymentsPanel({ bookingId, total, totalPaid, balance, players, cancelled, payments }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [slotMethod, setSlotMethod] = useState<Method>("cash");
  const [slotNotes, setSlotNotes] = useState("");

  const [freeOpen, setFreeOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("cash");
  const [notes, setNotes] = useState("");

  const [voiding, setVoiding] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const bySlot = new Map<number, PaymentItem>();
  for (const p of payments) if (p.playerSlot && !p.isVoided) bySlot.set(p.playerSlot, p);
  const paidPlayers = bySlot.size;

  function run(action: () => Promise<ActionResult>, after?: () => void) {
    setMsg(null);
    start(async () => {
      const r = await action();
      setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
      if (r.ok) {
        after?.();
        if (/registrado/i.test(r.message)) playGoal();
        router.refresh();
      }
    });
  }

  const pct = total > 0 ? Math.min(100, Math.round((totalPaid / total) * 100)) : 0;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold uppercase">Cobros</h2>

      <div className="mb-4">
        <div className="mb-1 flex justify-between text-sm">
          <span>Cobrado {formatMoney(totalPaid)} de {formatMoney(total)}</span>
          <span className={cn("font-semibold", balance > 0 ? "text-warning" : "text-lime-ink")}>
            {balance > 0 ? `Saldo ${formatMoney(balance)}` : "Cancha saldada"}
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

      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Jugadores</h3>
        <span className="text-sm text-muted">{paidPlayers} de {players} pagaron</span>
      </div>

      <PlayersPitch
        players={Array.from({ length: players }, (_, i) => i + 1).map((slot) => ({ slot, paid: bySlot.has(slot), label: bySlot.has(slot) ? "pagó" : "falta cobrar" }))}
        selected={openSlot}
        disabled={cancelled || pending}
        onPick={(slot) => {
          setOpenSlot(openSlot === slot ? null : slot);
          setSlotNotes("");
        }}
      />
      <PitchLegend />

      {openSlot !== null && (() => {
        const slot = openSlot;
        const paid = bySlot.get(slot);
        const share = playerShare(total, players, slot);
        const teamA = slot <= Math.ceil(players / 2);
        return (
          <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-3 w-3 rounded-full" style={{ background: teamA ? TEAM_A : TEAM_B }} />
              Jugador {slot} · equipo {teamA ? "azul" : "naranja"} · {formatMoney(paid ? paid.amount : share)}
            </p>
            {paid ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted">{METHODS[paid.method]} · pagó{paid.notes ? ` · ${paid.notes}` : ""}</span>
                {!cancelled && (
                  <button type="button" className="text-danger hover:underline" onClick={() => { setVoiding(paid.id); setReason(""); }}>
                    Anular cobro
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <select className={cn(field, "h-10 sm:w-44")} value={slotMethod} onChange={(e) => setSlotMethod(e.target.value as Method)} aria-label={`Medio de pago del jugador ${slot}`}>
                  {Object.entries(METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input className={cn(field, "h-10 flex-1")} placeholder="Nombre / nota" value={slotNotes} onChange={(e) => setSlotNotes(e.target.value)} maxLength={300} aria-label={`Nota del jugador ${slot}`} />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => registerPlayerPayment(bookingId, { slot, method: slotMethod, notes: slotNotes }), () => setOpenSlot(null))}
                  className="h-10 rounded-xl bg-lime px-4 text-sm font-bold uppercase tracking-wide text-black disabled:opacity-50"
                >
                  Cobrar {formatMoney(share)}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {voiding && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-danger/40 p-3">
          <span className="text-sm">Anular este cobro:</span>
          <input className={cn(field, "h-10 flex-1")} placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
          <button className="h-10 rounded-xl bg-danger px-4 text-sm font-bold text-white disabled:opacity-50" disabled={pending} onClick={() => run(() => voidPayment(voiding, reason), () => setVoiding(null))}>
            Confirmar anulación
          </button>
          <button className="h-10 rounded-xl border border-border px-4 text-sm" onClick={() => setVoiding(null)}>Volver</button>
        </div>
      )}

      {!cancelled && balance > 0 && (
        <div className="mt-4">
          <button type="button" className="text-sm text-lime-ink underline-offset-2 hover:underline" onClick={() => setFreeOpen((v) => !v)} aria-expanded={freeOpen}>
            {freeOpen ? "Ocultar pago libre" : "Registrar un pago libre (seña o monto distinto)"}
          </button>
          {freeOpen && (
            <form
              className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => registerPayment(bookingId, { amount: Number(amount.replace(",", ".")), method, notes }), () => {
                  setNotes("");
                  setAmount("");
                });
              }}
            >
              <label className="flex flex-col gap-1 text-sm">Monto
                <input className={field} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required />
              </label>
              <label className="flex flex-col gap-1 text-sm">Medio
                <select className={field} value={method} onChange={(e) => setMethod(e.target.value as Method)}>
                  {Object.entries(METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">Nota (opcional)
                <input className={field} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
              </label>
              <div className="flex items-end">
                <button type="submit" disabled={pending} className="h-11 rounded-xl bg-lime px-5 text-sm font-bold uppercase tracking-wide text-black disabled:opacity-50">Registrar</button>
              </div>
              <p className="text-xs text-muted sm:col-span-4">Un pago libre reduce el saldo pero no marca a ningún jugador como pagado.</p>
            </form>
          )}
        </div>
      )}

      <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-muted">Historial</h3>
      {payments.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay cobros registrados.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {payments.map((p) => (
            <li key={p.id} className={cn("rounded-xl border border-border px-3 py-2", p.isVoided && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-x-2">
                <span className={cn("font-semibold", p.isVoided && "line-through")}>{formatMoney(p.amount)}</span>
                <span className="text-sm text-muted">
                  {p.playerSlot ? `Jugador ${p.playerSlot}` : "Pago libre"} · {METHODS[p.method]} · {formatDateShort(p.paidAt)} {formatTime(p.paidAt)}
                </span>
                {p.isVoided && <span className="rounded-full border border-danger/50 px-2 py-0.5 text-xs text-danger">Anulado</span>}
              </div>
              {(p.notes || p.voidReason) && (
                <p className="mt-1 text-sm text-muted">{p.notes}{p.voidReason ? ` · Motivo de anulación: ${p.voidReason}` : ""}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
