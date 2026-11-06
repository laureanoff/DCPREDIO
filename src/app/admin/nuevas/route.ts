import { getStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Consulta liviana para los avisos del panel: reservas creadas después de `since`.
 * Devuelve también la hora del servidor (`now`) para usar de próximo `since` sin depender del reloj del dispositivo.
 */
export async function GET(request: Request) {
  const staff = await getStaff();
  if (!staff) return Response.json({ error: "No autenticado" }, { status: 401 });

  const supabase = await createClient();
  const nowRes = new Date().toISOString();
  const since = new URL(request.url).searchParams.get("since");
  const headers = { "Cache-Control": "private, no-store" };
  if (!since || Number.isNaN(Date.parse(since))) return Response.json({ now: nowRes, bookings: [] }, { headers });

  const { data, error } = await supabase
    .from("bookings")
    .select("id, code, customer_name, start_at, end_at, status, created_at")
    .gt("created_at", since)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) return Response.json({ error: "No se pudo consultar" }, { status: 500, headers });

  // `now` = la última reserva vista o la hora actual: así no se pierde ninguna entre consultas.
  const last = data?.length ? data[data.length - 1].created_at : nowRes;
  return Response.json({ now: last > nowRes ? last : nowRes, bookings: data ?? [] }, { headers });
}
