"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEmployee, resetEmployeePassword, setEmployeeActive } from "./actions";
import { cn } from "@/lib/utils";

const field = "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";
type Emp = { id: string; name: string; email: string; active: boolean };
type Msg = { ok: boolean; text: string } | null;

function Notice({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <p role={msg.ok ? "status" : "alert"} className={cn("rounded-xl border px-3 py-2 text-sm", msg.ok ? "border-lime-ink/40 bg-lime/10 text-lime-ink" : "border-danger/50 bg-danger/10 text-danger")}>{msg.text}</p>;
}

function Row({ e, onMsg }: { e: Emp; onMsg: (m: Msg) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  return (
    <li className="flex flex-col gap-2 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{e.name} {!e.active && <span className="ml-1 rounded bg-danger/15 px-1.5 py-0.5 text-xs text-danger">Desactivado</span>}</p>
          <p className="text-muted">{e.email}</p>
        </div>
        <div className="flex gap-2">
          <button disabled={pending} onClick={() => setShowPw((s) => !s)} className="h-10 rounded-xl border border-border px-3 font-semibold hover:border-lime">Contraseña</button>
          <button disabled={pending} onClick={() => start(async () => { const r = await setEmployeeActive(e.id, !e.active); onMsg({ ok: r.ok, text: r.ok ? r.message : r.error }); router.refresh(); })} className="h-10 rounded-xl border border-border px-3 font-semibold hover:border-danger disabled:opacity-50">{e.active ? "Desactivar" : "Reactivar"}</button>
        </div>
      </div>
      {showPw && (
        <form className="flex gap-2" onSubmit={(ev) => { ev.preventDefault(); start(async () => { const r = await resetEmployeePassword(e.id, pw); onMsg({ ok: r.ok, text: r.ok ? r.message : r.error }); if (r.ok) { setPw(""); setShowPw(false); } }); }}>
          <input className={field} type="text" autoComplete="off" value={pw} onChange={(ev) => setPw(ev.target.value)} placeholder="Nueva contraseña (mín. 10)" minLength={10} required />
          <button disabled={pending} className="h-11 shrink-0 rounded-xl bg-lime px-4 font-semibold text-black disabled:opacity-50">Cambiar</button>
        </form>
      )}
    </li>
  );
}

export function EmployeesUI({ employees }: { employees: Emp[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <>
      <Notice msg={msg} />
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-bold uppercase">Empleados</h2>
        {employees.length === 0 ? <p className="text-sm text-muted">Todavía no cargaste empleados.</p> : (
          <ul className="divide-y divide-border">{employees.map((e) => <Row key={e.id} e={e} onMsg={setMsg} />)}</ul>
        )}
      </section>
      <form
        className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          start(async () => {
            const r = await createEmployee({ fullName, email, password });
            setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
            if (r.ok) { setFullName(""); setEmail(""); setPassword(""); router.refresh(); }
          });
        }}
      >
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase sm:col-span-2">Nuevo empleado</h2>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">Nombre
          <input className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">Email
          <input className={field} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">Contraseña inicial (mín. 10)
          <input className={field} type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} required />
        </label>
        <button disabled={pending} className="h-12 rounded-xl bg-lime font-semibold text-black disabled:opacity-50 sm:col-span-2">{pending ? "Creando…" : "Crear empleado"}</button>
      </form>
    </>
  );
}
