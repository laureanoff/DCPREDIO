"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCancelledBookings } from "./actions";

/** Botón de dos pasos (sin diálogos del navegador). Sin `ids` borra todas las canceladas sin pagos. */
export function DeleteCancelled({
  ids,
  label,
  redirectTo,
  includePaid = false,
  warning,
}: {
  ids?: string[];
  label: string;
  redirectTo?: string;
  includePaid?: boolean;
  warning?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function run() {
    start(async () => {
      const r = await deleteCancelledBookings(ids, includePaid);
      setConfirming(false);
      setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
      if (r.ok) {
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!confirming ? (
        <button
          type="button"
          onClick={() => { setMsg(null); setConfirming(true); }}
          className="flex items-center gap-1.5 rounded-xl border border-danger/50 px-3 py-1.5 text-sm font-medium text-danger transition hover:bg-danger/10"
        >
          <Trash2 size={15} /> {label}
        </button>
      ) : (
        <>
          <span className="text-sm">{warning ?? "Se borra para siempre."} ¿Seguro?</span>
          <button type="button" disabled={pending} onClick={run} className="rounded-xl bg-danger px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Eliminando…" : "Sí, eliminar"}
          </button>
          <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="rounded-xl border border-border px-3 py-1.5 text-sm">
            No
          </button>
        </>
      )}
      {msg && <span role="status" className={msg.ok ? "text-sm text-lime-ink" : "text-sm text-danger"}>{msg.text}</span>}
    </div>
  );
}
