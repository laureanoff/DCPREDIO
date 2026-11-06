import { getStaff } from "@/lib/auth";
import { fetchDataset, isDatasetKey, toCsv, DATASETS, type DatasetKey } from "@/queries/backup";

/** Descarga de respaldos. Solo administradores. Ejemplos: ?tabla=reservas&formato=csv · ?tabla=todo&formato=json */
export async function GET(request: Request) {
  const staff = await getStaff();
  if (!staff) return new Response("No autenticado.", { status: 401 });
  if (staff.role !== "admin") return new Response("Solo administradores.", { status: 403 });

  const url = new URL(request.url);
  const tabla = url.searchParams.get("tabla");
  const formato = url.searchParams.get("formato") === "csv" ? "csv" : "json";
  const stamp = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

  try {
    if (tabla === "todo") {
      if (formato === "csv") return new Response("El respaldo completo se descarga en JSON.", { status: 400 });
      const keys = Object.keys(DATASETS) as DatasetKey[];
      const entries = await Promise.all(keys.map(async (k) => [k, await fetchDataset(k)] as const));
      const body = JSON.stringify({ exportado: new Date().toISOString(), ...Object.fromEntries(entries) }, null, 2);
      return new Response(body, {
        headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="respaldo-completo-${stamp}.json"` },
      });
    }
    if (!isDatasetKey(tabla)) return new Response("Tabla inválida.", { status: 400 });

    const rows = await fetchDataset(tabla);
    const body = formato === "csv" ? toCsv(rows) : JSON.stringify(rows, null, 2);
    return new Response(body, {
      headers: {
        ...headers,
        "Content-Type": formato === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${tabla}-${stamp}.${formato}"`,
      },
    });
  } catch (e) {
    console.error("[respaldos]", e instanceof Error ? e.message : e);
    return new Response("No se pudo generar el respaldo.", { status: 500 });
  }
}
