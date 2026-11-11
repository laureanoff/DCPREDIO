"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { ageFrom, BILLING_LABEL, ENROLLMENT_STATUS, WEEKDAYS, type Billing } from "@/lib/training";
import { whatsappLink } from "@/business/confirmation-message";
import { addTrainingPayment, deleteEnrollment, saveEnrollmentNotes, setEnrollmentStatus, voidTrainingPayment } from "./actions";

export type EnrollmentRow = {
  id: string; activity: string; pack: string; daysPerWeek: number; billing: string; price: number; preferredDays: number[]; preferredTime: string; notes: string;
  status: string; startDate: string | null; staffNotes: string; createdAt: string;
  student: string; birthDate: string | null; guardian: string; phone: string; email: string; emergency: string; health: string;
  payments: PaymentItem[];
};
export type PaymentItem = { id: string; amount: number; method: string; concept: string; paidAt: string; voided: boolean; voidReason: string };

const METHOD: Record<string, string> = { cash: "Efectivo", transfer: "Transferencia", other: "Otro" };

function Payments({ r }: { r: EnrollmentRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
  const [f, setF] = useState({ amount: String(r.price), method: "cash", concept: "", date: today });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const total = r.payments.filter((p) => !p.voided).reduce((t, p) => t + p.amount, 0);
  const inp = "h-10 min-w-0 rounded-xl border border-border bg-surface-2 px-3 text-base outline-none focus:border-lime";

  function run(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, onOk?: () => void) {
    setMsg(null);
    start(async () => {
      const x = await fn();
      setMsg({ ok: x.ok, text: (x.ok ? x.message : x.error) ?? "" });
      if (x.ok) { onOk?.(); router.refresh(); }
    });
  }

  return (
    <section aria-label="Cobros" className="rounded-xl border border-border bg-surface-2/50 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">Cobros</h3>
        <span className="text-sm text-muted">Total cobrado: <strong className="text-foreground">{formatMoney(total)}</strong></span>
      </div>
      {r.payments.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1.5">
          {r.payments.map((p) => (
            <li key={p.id} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm", p.voided && "text-muted line-through")}>
              <span className="w-20 shrink-0 text-muted">{new Date(p.paidAt).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Cordoba", day: "2-digit", month: "2-digit", year: "2-digit" })}</span>
              <strong className="w-24 shrink-0">{formatMoney(p.amount)}</strong>
              <span className="min-w-0 flex-1 truncate">{METHOD[p.method]}{p.concept ? ` · ${p.concept}` : ""}{p.voided && p.voidReason ? ` · anulado: ${p.voidReason}` : ""}</span>
              {!p.voided && (
                <button type="button" disabled={pending} onClick={() => { const reason = prompt("Motivo de la anulación (opcional):"); if (reason !== null) run(() => voidTrainingPayment(p.id, reason)); }} className="text-xs text-muted underline underline-offset-2 hover:text-danger">Anular</button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="grid gap-2 sm:grid-cols-[7rem_9rem_1fr_9rem_auto]"
        onSubmit={(e) => { e.preventDefault(); run(() => addTrainingPayment(r.id, { amount: Number(f.amount.replace(",", ".")), method: f.method as "cash", concept: f.concept, date: f.date, notes: "" }), () => setF((s) => ({ ...s, concept: "" }))); }}
      >
        <input className={inp} inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} aria-label="Monto" placeholder="Monto" required />
        <select className={inp} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} aria-label="Medio de pago">
          <option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="other">Otro</option>
        </select>
        <input className={inp} value={f.concept} maxLength={100} onChange={(e) => setF({ ...f, concept: e.target.value })} aria-label="Concepto" placeholder="Concepto (ej. Noviembre)" />
        <input className={inp} type="date" value={f.date} max={today} onChange={(e) => setF({ ...f, date: e.target.value })} aria-label="Fecha del cobro" required />
        <button type="submit" disabled={pending} className="h-10 rounded-xl bg-lime px-4 text-sm font-semibold text-black disabled:opacity-60">Registrar cobro</button>
      </form>
      {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-lime-ink" : "text-danger"}`}>{msg.text}</p>}
    </section>
  );
}

const TONE: Record<string, string> = {
  pending: "border-warning/50 bg-warning/10 text-warning",
  active: "border-lime/50 bg-lime/10 text-lime-ink",
  paused: "border-border bg-surface-2 text-muted",
  cancelled: "border-danger/40 bg-danger/10 text-danger",
};

function Card({ r, isAdmin }: { r: EnrollmentRow; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(r.status === "pending");
  const [note, setNote] = useState(r.staffNotes);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const age = ageFrom(r.birthDate);
  const wa = whatsappLink(r.phone, `Hola ${r.guardian || r.student}, te escribimos del predio por la inscripción de ${r.student} a ${r.activity} (${r.pack}).`);

  function run(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setMsg(null);
    start(async () => {
      const x = await fn();
      setMsg({ ok: x.ok, text: (x.ok ? x.message : x.error) ?? "" });
      if (x.ok) router.refresh();
    });
  }
  const btn = "h-10 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60";

  return (
    <li className={cn("rounded-2xl border border-border bg-surface p-4", r.status === "cancelled" && "opacity-70")}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-left">
        <span className="min-w-40 flex-1">
          <span className="block font-semibold">{r.student}{age !== null && <span className="font-normal text-muted"> · {age} años</span>}</span>
          <span className="block text-sm text-muted">{r.activity} · {r.pack} · {r.daysPerWeek} {r.daysPerWeek === 1 ? "día" : "días"}/sem</span>
        </span>
        <span className="text-sm font-semibold">{formatMoney(r.price)} <span className="font-normal text-muted">{BILLING_LABEL[r.billing as Billing]?.toLowerCase()}</span></span>
        <span className={cn("rounded-full border px-3 py-0.5 text-xs font-semibold", TONE[r.status])}>{ENROLLMENT_STATUS[r.status]}</span>
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 text-sm">
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {r.guardian && r.guardian !== r.student && <Info k="Responsable" v={r.guardian} />}
            <Info k="Teléfono" v={r.phone} />
            {r.email && <Info k="Email" v={r.email} />}
            {r.birthDate && <Info k="Nacimiento" v={new Date(`${r.birthDate}T00:00:00`).toLocaleDateString("es-AR")} />}
            <Info k="Días preferidos" v={r.preferredDays.length ? r.preferredDays.map((d) => WEEKDAYS[d]).join(", ") : "—"} />
            {r.preferredTime && <Info k="Franja horaria" v={r.preferredTime} />}
            {r.emergency && <Info k="Emergencia" v={r.emergency} />}
            {r.startDate && <Info k="Inicio" v={new Date(`${r.startDate}T00:00:00`).toLocaleDateString("es-AR")} />}
            <Info k="Solicitada" v={new Date(r.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Cordoba", dateStyle: "short", timeStyle: "short" })} />
          </dl>
          {r.health && <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2"><strong>Salud:</strong> {r.health}</p>}
          {r.notes && <p className="rounded-xl bg-surface-2 px-3 py-2"><strong>Comentarios de la familia:</strong> {r.notes}</p>}

          {r.status !== "cancelled" && <Payments r={r} />}

          <label className="flex flex-col gap-1.5 font-medium">Notas internas
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Horario asignado, observaciones…" className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-base font-normal outline-none focus:border-lime" />
          </label>
          {note.trim() !== r.staffNotes && (
            <button type="button" disabled={pending} onClick={() => run(() => saveEnrollmentNotes(r.id, note))} className={cn(btn, "self-start border border-border hover:border-lime")}>Guardar nota</button>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={cn(btn, "inline-flex items-center gap-1.5 bg-lime leading-10 text-black hover:brightness-110")}><Phone size={15} aria-hidden /> WhatsApp</a>}
            {r.status === "pending" && <button type="button" disabled={pending} onClick={() => run(() => setEnrollmentStatus(r.id, "active"))} className={cn(btn, "border border-lime text-lime-ink hover:bg-lime/15")}>Aceptar</button>}
            {r.status === "active" && <button type="button" disabled={pending} onClick={() => run(() => setEnrollmentStatus(r.id, "paused"))} className={cn(btn, "border border-border hover:border-lime")}>Pausar</button>}
            {(r.status === "paused" || r.status === "cancelled") && <button type="button" disabled={pending} onClick={() => run(() => setEnrollmentStatus(r.id, "active"))} className={cn(btn, "border border-lime text-lime-ink hover:bg-lime/15")}>Reactivar</button>}
            {r.status !== "cancelled" && (
              <button type="button" disabled={pending} onClick={() => { if (confirm(r.status === "pending" ? "¿Rechazar esta solicitud?" : "¿Dar de baja a este alumno?")) run(() => setEnrollmentStatus(r.id, "cancelled")); }} className={cn(btn, "border border-border text-danger hover:border-danger")}>
                {r.status === "pending" ? "Rechazar" : "Dar de baja"}
              </button>
            )}
            {isAdmin && (
              <button type="button" disabled={pending} onClick={() => { if (confirm("¿Borrar esta inscripción para siempre?")) run(() => deleteEnrollment(r.id)); }} className={cn(btn, "ml-auto border border-border text-muted hover:text-danger")}>Borrar</button>
            )}
          </div>
          {msg && <p role="status" className={`text-sm ${msg.ok ? "text-lime-ink" : "text-danger"}`}>{msg.text}</p>}
        </div>
      )}
    </li>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

export function EnrollmentList({ rows, isAdmin }: { rows: EnrollmentRow[]; isAdmin: boolean }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-muted">No hay inscripciones en esta sección.</p>;
  }
  return <ul className="flex flex-col gap-3">{rows.map((r) => <Card key={r.id} r={r} isAdmin={isAdmin} />)}</ul>;
}
