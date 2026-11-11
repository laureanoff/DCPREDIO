import { cacheLife, cacheTag } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
import type { Billing } from "@/lib/training";

export type PublicPack = { id: string; name: string; description: string | null; daysPerWeek: number; prices: Partial<Record<Billing, number>> };
export type PublicActivity = { id: string; name: string; description: string | null; location: string | null; packs: PublicPack[] };

/** Actividades y packs activos con sus precios. Se refresca solo (y al instante cuando el panel guarda cambios). */
export async function getTrainingCatalog(): Promise<PublicActivity[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("trainings");

  const supabase = createAnonClient();
  const [acts, packs, prices] = await Promise.all([
    supabase.from("training_activities").select("id, name, description, location").eq("is_active", true).order("sort_order").order("created_at"),
    supabase.from("training_packs").select("id, activity_id, name, description, days_per_week").eq("is_active", true).order("sort_order").order("days_per_week"),
    supabase.from("training_pack_prices").select("pack_id, billing, price"),
  ]);
  if (acts.error || packs.error || prices.error) throw new Error(`No se pudieron leer los entrenamientos: ${(acts.error ?? packs.error ?? prices.error)?.message}`);

  return (acts.data ?? [])
    .map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      location: a.location,
      packs: (packs.data ?? [])
        .filter((p) => p.activity_id === a.id)
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          daysPerWeek: p.days_per_week,
          prices: Object.fromEntries((prices.data ?? []).filter((x) => x.pack_id === p.id).map((x) => [x.billing, Number(x.price)])) as Partial<Record<Billing, number>>,
        }))
        .filter((p) => Object.keys(p.prices).length > 0),
    }))
    .filter((a) => a.packs.length > 0);
}

export type Coach = { name: string; title: string; bio: string };

/** Datos del profe (se editan en Configuración). null si está oculto o sin nombre. */
export async function getCoach(): Promise<Coach | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("trainings");

  const { data, error } = await createAnonClient().from("training_settings").select("coach_name, coach_title, coach_bio, show_coach").maybeSingle();
  if (error || !data || !data.show_coach || !data.coach_name.trim()) return null;
  return { name: data.coach_name, title: data.coach_title, bio: data.coach_bio };
}
