import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "border-warning/50 bg-warning/15 text-warning" },
  confirmed: { label: "Confirmada", cls: "border-lime-ink/40 bg-lime/15 text-lime-ink" },
  completed: { label: "Completada", cls: "border-border bg-surface-2 text-muted" },
  cancelled: { label: "Cancelada", cls: "border-danger/50 bg-danger/10 text-danger" },
};

const PAYMENT: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "Sin pago", cls: "border-border bg-surface-2 text-muted" },
  partial: { label: "Pago parcial", cls: "border-warning/50 bg-warning/15 text-warning" },
  paid: { label: "Pagada", cls: "border-lime-ink/40 bg-lime/15 text-lime-ink" },
};

const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.pending;
  return <span className={cn(base, s.cls)}>{s.label}</span>;
}

export function PaymentBadge({ status }: { status: string }) {
  const s = PAYMENT[status] ?? PAYMENT.unpaid;
  return <span className={cn(base, s.cls)}>{s.label}</span>;
}
