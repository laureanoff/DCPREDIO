import "server-only";
import { createClient } from "@/lib/supabase/server";

export const DATASETS = {
  reservas: { table: "bookings", order: "created_at", label: "Reservas" },
  pagos: { table: "payments", order: "created_at", label: "Pagos (incluye anulados)" },
  avisos: { table: "notification_logs", order: "created_at", label: "Avisos enviados y fallidos" },
  configuracion: { table: "venue_settings", order: "id", label: "Configuración del predio" },
  horarios: { table: "operating_hours", order: "weekday", label: "Horarios de atención" },
} as const;

export type DatasetKey = keyof typeof DATASETS;
export const isDatasetKey = (k: string | null): k is DatasetKey => !!k && k in DATASETS;

type Row = Record<string, unknown>;

/** Lee TODA la tabla en páginas de 1000 (el límite por consulta de la API) con la sesión de quien exporta (RLS). */
export async function fetchDataset(key: DatasetKey): Promise<Row[]> {
  const supabase = await createClient();
  const { table, order } = DATASETS[key];
  const rows: Row[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase.from(table).select("*").order(order).range(from, from + size - 1);
    if (error) throw new Error(`No se pudo leer ${table}: ${error.message}`);
    rows.push(...(data as Row[]));
    if (!data || data.length < size) break;
  }
  return rows;
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "object" ? JSON.stringify(v) : String(v);
  // Evita que Excel interprete el contenido como fórmula (inyección en CSV).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV con BOM UTF-8 para que Excel muestre bien los acentos. */
export function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "﻿";
  const cols = Object.keys(rows[0]);
  return "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
}
