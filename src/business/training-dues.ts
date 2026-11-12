import type { Billing } from "@/lib/training";

/**
 * Estado de la cuota de un alumno, calculado con los cobros registrados (sin pedir datos extra):
 * - Mensual / trimestral: cada cobro del valor de la cuota cubre 1 o 3 meses contados desde la fecha de inicio.
 * - Por clase: cada cobro del valor cubre una clase; se compara con las clases a las que vino.
 */
export type DueState = "ok" | "soon" | "overdue" | "no_start" | "classes_due";

export type Due = {
  state: DueState;
  /** Hasta qué día está pago (mensual/trimestral), AAAA-MM-DD. */
  paidUntil: string | null;
  /** Días de atraso (0 = vence hoy). */
  overdueDays: number;
  /** Clases que vino y no pagó (por clase). */
  classesDue: number;
  /** Cobros que cubren períodos o clases enteros. */
  unitsPaid: number;
  /** Monto sugerido a cobrar ahora. */
  amountDue: number;
  /** Pagó una parte de la cuota que todavía no completa un período. */
  partial: number;
};

export const SOON_DAYS = 5;

function toUtc(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

/** Suma meses a una fecha AAAA-MM-DD sin pasarse de fin de mes (31/1 + 1 mes = 28/2). */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const total = m - 1 + months;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export function computeDue(i: { billing: Billing; price: number; startDate: string | null; paidTotal: number; attended: number; today: string }): Due {
  const base: Due = { state: "ok", paidUntil: null, overdueDays: 0, classesDue: 0, unitsPaid: 0, amountDue: 0, partial: 0 };
  if (i.price <= 0) return base;
  const units = Math.floor(i.paidTotal / i.price + 1e-6);
  const partial = Math.max(0, Math.round((i.paidTotal - units * i.price) * 100) / 100);
  const common = { ...base, unitsPaid: units, partial: partial < 0.01 ? 0 : partial };

  if (i.billing === "per_class") {
    const due = Math.max(0, i.attended - units);
    return { ...common, state: due > 0 ? "classes_due" : "ok", classesDue: due, amountDue: due * i.price };
  }
  if (!i.startDate) return { ...common, state: "no_start", amountDue: i.price };
  const months = units * (i.billing === "quarterly" ? 3 : 1);
  const paidUntil = addMonths(i.startDate, months);
  const left = daysBetween(i.today, paidUntil);
  if (left <= 0) return { ...common, state: "overdue", paidUntil, overdueDays: -left, amountDue: Math.max(0, i.price - common.partial) };
  return { ...common, state: left <= SOON_DAYS ? "soon" : "ok", paidUntil };
}
