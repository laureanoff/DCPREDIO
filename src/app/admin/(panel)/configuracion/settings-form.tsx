"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSettings } from "./actions";
import type { VenueSettingsForm } from "@/queries/admin";
import { cn, formatMoney } from "@/lib/utils";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const field =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-base outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase">{title}</h2>
      {hint && <p className="mb-3 text-sm text-muted">{hint}</p>}
      <div className={cn("grid gap-3 sm:grid-cols-2", !hint && "mt-3")}>{children}</div>
    </section>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={cn("flex flex-col gap-1 text-sm", wide && "sm:col-span-2")}>
      {label}
      {children}
    </label>
  );
}

export function SettingsForm({ initial }: { initial: VenueSettingsForm }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [f, setF] = useState(initial);
  const set = <K extends keyof VenueSettingsForm>(k: K, v: VenueSettingsForm[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (v: string) => (v === "" ? 0 : Number(v.replace(",", ".")));

  function setHour(weekday: number, patch: Partial<VenueSettingsForm["hours"][number]>) {
    set("hours", f.hours.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)));
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await saveSettings(f);
          setMsg({ ok: r.ok, text: r.ok ? r.message : r.error });
          if (r.ok) router.refresh();
        });
      }}
    >
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={cn("rounded-2xl border px-4 py-3 text-sm", msg.ok ? "border-lime-ink/40 bg-lime/10 text-lime-ink" : "border-danger/50 bg-danger/10 text-danger")}>
          {msg.text}
        </p>
      )}

      <Section title="Precio y capacidad" hint="El precio que ven las personas al reservar. Los cambios valen para reservas nuevas: las ya hechas conservan su precio.">
        <Field label="Precio del turno (cancha completa), en pesos">
          <input className={field} inputMode="decimal" value={f.priceTurn || ""} onChange={(e) => set("priceTurn", num(e.target.value))} placeholder="0" required />
        </Field>
        <Field label="Jugadores por turno">
          <input className={field} type="number" min={1} max={50} value={f.maxPlayers} onChange={(e) => set("maxPlayers", Number(e.target.value))} required />
        </Field>
        <p className="text-sm text-muted sm:col-span-2">
          Con esos valores cada jugador paga {formatMoney(f.maxPlayers > 0 ? Math.round(f.priceTurn / f.maxPlayers) : 0)} aprox. La cantidad de jugadores aplica a las reservas nuevas.
        </p>
      </Section>

      <Section title="Turnos y reservas">
        <Field label="Duración del turno (minutos)">
          <input className={field} type="number" min={15} max={480} value={f.slotDurationMinutes} onChange={(e) => set("slotDurationMinutes", Number(e.target.value))} required />
        </Field>
        <Field label="Descanso entre turnos (minutos)">
          <input className={field} type="number" min={0} max={120} value={f.slotGapMinutes} onChange={(e) => set("slotGapMinutes", Number(e.target.value))} required />
        </Field>
        <Field label="Se puede reservar hasta (días hacia adelante)">
          <input className={field} type="number" min={1} max={365} value={f.bookingWindowDays} onChange={(e) => set("bookingWindowDays", Number(e.target.value))} required />
        </Field>
        <Field label="Máximo de reservas activas por teléfono">
          <input className={field} type="number" min={1} max={20} value={f.maxActiveBookingsPerPhone} onChange={(e) => set("maxActiveBookingsPerPhone", Number(e.target.value))} required />
        </Field>
        <label className="flex items-center gap-3 text-sm sm:col-span-2">
          <input type="checkbox" className="h-5 w-5 accent-[var(--lime)]" checked={f.requireConfirmation} onChange={(e) => set("requireConfirmation", e.target.checked)} />
          Las reservas nuevas quedan pendientes hasta que el predio las confirme
        </label>
      </Section>

      <Section title="Horarios de atención" hint="Si el cierre es 00:00 el último turno termina a medianoche.">
        <div className="flex flex-col gap-2 sm:col-span-2">
          {f.hours.map((h) => (
            <div key={h.weekday} className="grid grid-cols-[7rem_auto_1fr_1fr] items-center gap-2 sm:grid-cols-[8rem_auto_10rem_10rem]">
              <span className="text-sm font-medium">{DAYS[h.weekday]}</span>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-5 w-5 accent-[var(--lime)]" checked={h.isOpen} onChange={(e) => setHour(h.weekday, { isOpen: e.target.checked })} aria-label={`${DAYS[h.weekday]} abierto`} />
                Abierto
              </label>
              <input className={cn(field, "h-10")} type="time" value={h.open} disabled={!h.isOpen} onChange={(e) => setHour(h.weekday, { open: e.target.value })} aria-label={`${DAYS[h.weekday]} apertura`} />
              <input className={cn(field, "h-10")} type="time" value={h.close} disabled={!h.isOpen} onChange={(e) => setHour(h.weekday, { close: e.target.value })} aria-label={`${DAYS[h.weekday]} cierre`} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Datos del predio">
        <Field label="Nombre del predio" wide>
          <input className={field} value={f.venueName} onChange={(e) => set("venueName", e.target.value)} maxLength={80} required />
        </Field>
        <Field label="Dirección" wide>
          <input className={field} value={f.address} onChange={(e) => set("address", e.target.value)} maxLength={200} />
        </Field>
        <Field label="Teléfono de contacto">
          <input className={field} inputMode="tel" value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
        </Field>
        <Field label="WhatsApp de contacto (se muestra en la web)">
          <input className={field} inputMode="tel" value={f.contactWhatsapp} onChange={(e) => set("contactWhatsapp", e.target.value)} />
        </Field>
        <Field label="Email de contacto" wide>
          <input className={field} type="email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} maxLength={200} />
        </Field>
      </Section>

      <Section title="Avisos por WhatsApp" hint="Número que recibe el aviso de cada reserva nueva (formato internacional, ej. 5493511234567). No se muestra en la web.">
        <Field label="WhatsApp del predio para avisos" wide>
          <input className={field} inputMode="tel" value={f.notificationWhatsapp} onChange={(e) => set("notificationWhatsapp", e.target.value)} placeholder="5493511234567" />
        </Field>
      </Section>

      <div className="sticky bottom-3">
        <button type="submit" disabled={pending} className="h-12 w-full rounded-2xl bg-lime font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-black shadow-lg disabled:opacity-60 sm:w-auto sm:px-10">
          {pending ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </form>
  );
}
