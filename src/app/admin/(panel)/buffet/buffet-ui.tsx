"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addProduct, createSale, updateProduct, voidSale } from "./actions";
import { cn, formatMoney } from "@/lib/utils";

type Product = { id: string; name: string; price: number; active: boolean };
type Sale = { id: string; total: number; method: "cash" | "transfer" | "other"; note: string; voided: boolean; at: string; mine: boolean; items: string };
type Summary = { count: number; total: number; cash: number; transfer: number; other: number };
type Msg = { ok: boolean; text: string } | null;

const field = "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";
const card = "rounded-2xl border border-border bg-surface p-4";
const h2 = "mb-3 font-[family-name:var(--font-display)] text-lg font-bold uppercase";
const METHODS = { cash: "Efectivo", transfer: "Transferencia", other: "Otro" } as const;
const hhmm = (iso: string) => new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Cordoba", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

function Notice({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <p role={msg.ok ? "status" : "alert"} className={cn("rounded-xl border px-3 py-2 text-sm", msg.ok ? "border-lime-ink/40 bg-lime/10 text-lime-ink" : "border-danger/50 bg-danger/10 text-danger")}>{msg.text}</p>;
}

function ProductEditor({ p, onMsg }: { p: Product; onMsg: (m: Msg) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(p.name);
  const [price, setPrice] = useState(String(p.price));
  const [active, setActive] = useState(p.active);
  const dirty = name !== p.name || Number(price) !== p.price || active !== p.active;
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <input className={cn(field, "min-w-0 flex-1")} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Nombre" />
      <input className={cn(field, "w-28")} type="number" min={0} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Precio" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--lime)]" checked={active} onChange={(e) => setActive(e.target.checked)} />Activo</label>
      {dirty && <button disabled={pending} onClick={() => start(async () => { const r = await updateProduct(p.id, { name, price: Number(price), active }); onMsg({ ok: r.ok, text: r.ok ? r.message : r.error }); router.refresh(); })} className="h-11 rounded-xl bg-lime px-3 text-sm font-semibold text-black disabled:opacity-50">Guardar</button>}
    </li>
  );
}

export function BuffetUI({ isAdmin, products, sales, summary }: { isAdmin: boolean; userId: string; products: Product[]; sales: Sale[]; summary: Summary }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<"cash" | "transfer" | "other">("cash");
  const [note, setNote] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [voidId, setVoidId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const active = products.filter((p) => p.active);
  const total = useMemo(() => active.reduce((t, p) => t + p.price * (cart[p.id] ?? 0), 0), [active, cart]);
  const lines = Object.entries(cart).filter(([, q]) => q > 0);
  const change = (id: string, d: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(999, (c[id] ?? 0) + d)) }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Buffet</h1>
      <Notice msg={msg} />

      <section className={card}>
        <h2 className={h2}>Hoy</h2>
        <p className="text-2xl font-bold">{formatMoney(summary.total)} <span className="text-sm font-normal text-muted">· {summary.count} {summary.count === 1 ? "venta" : "ventas"}</span></p>
        <p className="text-sm text-muted">Efectivo {formatMoney(summary.cash)} · Transferencia {formatMoney(summary.transfer)}{summary.other > 0 ? ` · Otro ${formatMoney(summary.other)}` : ""}</p>
      </section>

      <section className={card}>
        <h2 className={h2}>Nueva venta</h2>
        {active.length === 0 ? <p className="text-sm text-muted">{isAdmin ? "Cargá productos abajo para empezar a vender." : "Todavía no hay productos cargados."}</p> : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {active.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 p-2 pl-3">
                <span className="min-w-0"><span className="block truncate font-semibold">{p.name}</span><span className="text-sm text-muted">{formatMoney(p.price)}</span></span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => change(p.id, -1)} aria-label={`Quitar ${p.name}`} className="h-11 w-11 rounded-xl border border-border text-xl">−</button>
                  <span className="w-7 text-center font-semibold" aria-live="polite">{cart[p.id] ?? 0}</span>
                  <button type="button" onClick={() => change(p.id, 1)} aria-label={`Agregar ${p.name}`} className="h-11 w-11 rounded-xl bg-lime text-xl font-bold text-black">+</button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {lines.length > 0 && (
          <form
            className="mt-4 flex flex-col gap-3 border-t border-border pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await createSale({ items: lines.map(([productId, quantity]) => ({ productId, quantity })), method, note });
                setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
                if (r.ok) { setCart({}); setNote(""); }
                router.refresh();
              });
            }}
          >
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(METHODS) as (keyof typeof METHODS)[]).map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m} className={cn("h-11 rounded-xl border text-sm font-semibold", method === m ? "border-lime bg-lime text-black" : "border-border")}>{METHODS[m]}</button>
              ))}
            </div>
            <input className={field} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Nota (opcional): mesa, equipo…" />
            <button disabled={pending} className="h-12 rounded-xl bg-lime font-semibold text-black disabled:opacity-50">{pending ? "Registrando…" : `Cobrar ${formatMoney(total)}`}</button>
          </form>
        )}
      </section>

      <section className={card}>
        <h2 className={h2}>Ventas de hoy</h2>
        {sales.length === 0 ? <p className="text-sm text-muted">Todavía no hay ventas hoy.</p> : (
          <ul className="divide-y divide-border">
            {sales.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className={cn(s.voided && "opacity-50 line-through")}>
                    <p className="font-semibold">{formatMoney(s.total)} · {METHODS[s.method]} · {hhmm(s.at)}</p>
                    <p className="text-muted">{s.items}{s.note ? ` — ${s.note}` : ""}</p>
                  </div>
                  {s.voided ? <span className="text-xs text-muted">Anulada</span> : (isAdmin || s.mine) && (
                    <button onClick={() => { setVoidId(voidId === s.id ? null : s.id); setVoidReason(""); }} className="h-10 shrink-0 rounded-xl border border-border px-3 font-semibold hover:border-danger">Anular</button>
                  )}
                </div>
                {voidId === s.id && (
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await voidSale(s.id, voidReason); setMsg({ ok: r.ok, text: r.ok ? r.message : r.error }); setVoidId(null); router.refresh(); }); }}>
                    <input className={field} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Motivo (opcional)" maxLength={300} />
                    <button disabled={pending} className="h-11 shrink-0 rounded-xl bg-danger px-4 font-semibold text-white disabled:opacity-50">Confirmar</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && (
        <section className={card}>
          <h2 className={h2}>Productos</h2>
          <ul className="divide-y divide-border">{products.map((p) => <ProductEditor key={`${p.id}-${p.name}-${p.price}-${p.active}`} p={p} onMsg={setMsg} />)}</ul>
          <form
            className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3"
            onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addProduct({ name: newName, price: Number(newPrice) }); setMsg({ ok: r.ok, text: r.ok ? r.message : r.error }); if (r.ok) { setNewName(""); setNewPrice(""); } router.refresh(); }); }}
          >
            <input className={cn(field, "min-w-0 flex-1")} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nuevo producto (ej. Gaseosa 500ml)" maxLength={80} required />
            <input className={cn(field, "w-28")} type="number" min={0} inputMode="decimal" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Precio" required />
            <button disabled={pending} className="h-11 rounded-xl border border-border px-4 font-semibold hover:border-lime disabled:opacity-50">Agregar</button>
          </form>
        </section>
      )}
    </div>
  );
}
