"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { cancelBooking, setBookingStatus } from "../reservas/actions";

type Props = {
  id: string;
  code: string;
  name: string;
  phone: string;
  dateLabel: string;
  timeLabel: string;
  players: number;
  receivedLabel: string;
};

/** Aviso de reserva nueva: se confirma o se rechaza desde acá. */
export function InboxCard(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    start(async () => {
      const r = await setBookingStatus(p.id, "confirmed");
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }
  function reject() {
    setError(null);
    start(async () => {
      const r = await cancelBooking(p.id, reason || "Rechazada por el predio");
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <li className="rounded-2xl border border-warning/50 bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-warning">Nueva reserva · {p.receivedLabel}</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/admin/reservas/${p.id}`} className="text-lg font-semibold hover:text-lime-ink">{p.name}</Link>
          <p className="text-sm text-muted">{p.phone} · {p.code}</p>
          <p className="mt-1 text-sm">
            <span className="font-semibold">{p.dateLabel}</span> · {p.timeLabel} · cancha completa (hasta {p.players} jugadores)
          </p>
        </div>
        {!rejecting && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={confirm}
              className="flex h-11 items-center gap-1.5 rounded-xl bg-lime px-5 font-semibold text-black transition hover:bg-lime-dark disabled:opacity-60"
            >
              <Check size={18} /> {pending ? "Confirmando…" : "Confirmar"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setRejecting(true)}
              className="flex h-11 items-center gap-1.5 rounded-xl border border-border px-4 text-sm text-muted transition hover:border-danger hover:text-danger"
            >
              <X size={16} /> Rechazar
            </button>
          </div>
        )}
      </div>

      {rejecting && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            maxLength={300}
            aria-label="Motivo del rechazo"
            className="h-11 min-w-48 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-lime"
          />
          <button type="button" disabled={pending} onClick={reject} className="h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Rechazando…" : "Rechazar reserva"}
          </button>
          <button type="button" disabled={pending} onClick={() => setRejecting(false)} className="h-11 rounded-xl border border-border px-4 text-sm">
            Volver
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </li>
  );
}
