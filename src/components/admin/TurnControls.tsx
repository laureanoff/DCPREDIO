"use client";

import { useState, useTransition } from "react";
import { Flag, Play, Undo2 } from "lucide-react";
import { finishTurn, resetTurn, startTurn } from "@/app/admin/(panel)/reservas/actions";

/** Botones para marcar el comienzo y el fin reales del turno. */
export function TurnControls({ id, startedAt, finishedAt }: { id: string; startedAt: string | null; finishedAt: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: (id: string) => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn(id);
      if (!r.ok) setError(r.error ?? "Error.");
    });
  }

  const btn = "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!startedAt && (
        <button type="button" disabled={pending} onClick={() => run(startTurn)} className={`${btn} bg-lime text-black hover:brightness-110`}>
          <Play size={16} aria-hidden /> Iniciar turno ahora
        </button>
      )}
      {startedAt && !finishedAt && (
        <button type="button" disabled={pending} onClick={() => run(finishTurn)} className={`${btn} bg-foreground text-background hover:opacity-90`}>
          <Flag size={16} aria-hidden /> Finalizar turno
        </button>
      )}
      {startedAt && (
        <button type="button" disabled={pending} onClick={() => run(resetTurn)} className={`${btn} border border-border text-muted hover:text-foreground`}>
          <Undo2 size={16} aria-hidden /> Deshacer
        </button>
      )}
      {error && <span role="alert" className="text-sm text-danger">{error}</span>}
    </div>
  );
}
