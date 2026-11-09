"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeWaitlistEntry } from "./actions";
import { cn } from "@/lib/utils";

export type Group = { key: string; label: string; court: string; free: boolean; people: { id: string; name: string; phone: string; wa: string | null }[] };

export function WaitlistUI({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const sorted = [...groups].sort((a, b) => Number(b.free) - Number(a.free));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Lista de espera</h1>
      <p className="text-sm text-muted">Gente que dejó sus datos para un turno ocupado. Cuando uno se libera, aparece marcado y podés avisarles por WhatsApp (en orden de llegada). Cuando se reserva el turno, quitalos de la lista.</p>
      {msg && <p role="status" className="rounded-xl border border-lime-ink/40 bg-lime/10 px-3 py-2 text-sm text-lime-ink">{msg}</p>}
      {sorted.length === 0 && <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-muted">No hay nadie en la lista de espera.</p>}
      {sorted.map((g) => (
        <section key={g.key} className={cn("rounded-2xl border p-4", g.free ? "border-lime bg-lime/10" : "border-border bg-surface")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold capitalize">{g.label}{g.court ? ` · ${g.court}` : ""}</h2>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", g.free ? "bg-lime text-black" : "bg-surface-2 text-muted")}>{g.free ? "¡Libre ahora!" : "Sigue ocupado"}</span>
          </div>
          <ol className="mt-2 divide-y divide-border">
            {g.people.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span><span className="text-muted">{i + 1}.</span> <strong>{p.name}</strong> <span className="text-muted">{p.phone}</span></span>
                <span className="flex shrink-0 gap-2">
                  {g.free && p.wa && <a href={p.wa} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-lime px-3 py-2 font-semibold text-black">Avisar</a>}
                  <button disabled={pending} onClick={() => start(async () => { const r = await removeWaitlistEntry(p.id); setMsg(r.ok ? r.message : r.error); router.refresh(); })} className="rounded-xl border border-border px-3 py-2 font-semibold hover:border-danger disabled:opacity-50">Quitar</button>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
