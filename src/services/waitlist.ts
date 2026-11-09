import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStaff } from "@/services/push";

export type JoinWaitlistResult = { ok: true } | { ok: false; error: string };

/** Anota a una persona en la lista de espera de un turno que hoy está ocupado. */
export async function joinWaitlist(input: { courtId: string; startAt: string; name: string; phone: string }): Promise<JoinWaitlistResult> {
  const supabase = createAdminClient();
  const { data: settings } = await supabase.from("venue_settings").select("timezone").eq("id", 1).single();
  const tz = settings?.timezone ?? "America/Argentina/Cordoba";
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(input.startAt));

  const { data: slots, error } = await supabase.rpc("get_day_availability", { p_court_id: input.courtId, p_date: date });
  if (error) return { ok: false, error: "No pudimos anotarte. Probá de nuevo en unos minutos." };
  const slot = (slots ?? []).find((s) => new Date(s.slot_start).getTime() === new Date(input.startAt).getTime());
  if (!slot) return { ok: false, error: "Ese horario no existe." };
  if (slot.state === "available" || slot.state === "partial") return { ok: false, error: "Ese turno está libre: podés reservarlo ahora." };
  if (slot.state !== "full") return { ok: false, error: "Ese turno no admite lista de espera." };

  const { count } = await supabase
    .from("waitlist_entries")
    .select("id", { count: "exact", head: true })
    .eq("customer_phone", input.phone)
    .gt("end_at", new Date().toISOString());
  if ((count ?? 0) >= 5) return { ok: false, error: "Ya estás en la lista de espera de varios turnos. Comunicate con el predio." };

  const { error: insErr } = await supabase
    .from("waitlist_entries")
    .upsert(
      { court_id: input.courtId, start_at: slot.slot_start, end_at: slot.slot_end, customer_name: input.name, customer_phone: input.phone },
      { onConflict: "court_id,start_at,customer_phone", ignoreDuplicates: true },
    );
  if (insErr) {
    console.error("[espera] insert", insErr.code, insErr.message);
    return { ok: false, error: "No pudimos anotarte. Probá de nuevo en unos minutos." };
  }
  return { ok: true };
}

/** Si hay gente esperando un turno que se acaba de liberar, avisa al personal por push. */
export async function notifyWaitlistFreed(courtId: string, startAt: string, endAt: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true })
      .eq("court_id", courtId)
      .lt("start_at", endAt)
      .gt("end_at", startAt);
    if (!count) return;
    await notifyStaff({
      title: "Se liberó un turno",
      body: `Hay ${count} ${count === 1 ? "persona" : "personas"} en la lista de espera para ese horario.`,
      url: "/admin/espera",
      tag: "waitlist",
    });
  } catch (e) {
    console.error("[espera] aviso", e instanceof Error ? e.message : e);
  }
}
