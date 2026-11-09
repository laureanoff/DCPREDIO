"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCourt, renameCourt, setCourtActive } from "./courts-actions";

export type CourtRow = { id: string; name: string; isActive: boolean };

const field = "h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";

function CourtItem({ court }: { court: CourtRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(court.name);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: (r.ok ? r.message : r.error) ?? "" });
      if (r.ok) router.refresh();
    });
  }

  return (
    <li className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Nombre de la cancha" className={field} />
        {name.trim() !== court.name && (
          <button type="button" disabled={pending} onClick={() => run(() => renameCourt(court.id, name))} className="h-10 rounded-xl bg-lime px-3 text-sm font-semibold text-black disabled:opacity-60">
            Guardar
          </button>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[var(--lime)]" checked={court.isActive} disabled={pending} onChange={(e) => run(() => setCourtActive(court.id, e.target.checked))} />
          Activa
        </label>
      </div>
      {msg && <p role="status" className={`text-xs ${msg.ok ? "text-lime-ink" : "text-danger"}`}>{msg.text}</p>}
    </li>
  );
}

export function CourtsManager({ courts }: { courts: CourtRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase">Canchas</h2>
      <p className="mb-3 text-sm text-muted">
        Si agregás más de una cancha activa, la web le pide al cliente que elija cuál. Todas usan el mismo precio y los mismos horarios.
        Se aplica al instante (no hace falta el botón de guardar de abajo).
      </p>
      <ul className="flex flex-col gap-3">
        {courts.map((c) => <CourtItem key={c.id} court={c} />)}
      </ul>
      <form
        className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          start(async () => {
            const r = await addCourt(name);
            setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
            if (r.ok) { setName(""); router.refresh(); }
          });
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Nueva cancha (ej. Cancha 2)" aria-label="Nombre de la nueva cancha" className={field} />
        <button type="submit" disabled={pending || name.trim() === ""} className="h-10 rounded-xl border border-border px-4 text-sm font-semibold transition hover:border-lime disabled:opacity-50">
          Agregar cancha
        </button>
      </form>
      {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-lime-ink" : "text-danger"}`}>{msg.text}</p>}
    </section>
  );
}
