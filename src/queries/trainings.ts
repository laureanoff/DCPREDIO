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

export type Coach = { name: string; title: string; bio: string; story: string; photo: { url: string; zoom: number; x: number; y: number } | null };

/** Datos del profe (se editan en Configuración). null si está oculto o sin nombre. */
export async function getCoach(): Promise<Coach | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("trainings");

  const { data, error } = await createAnonClient().from("training_settings").select("coach_name, coach_title, coach_bio, coach_story, show_coach, coach_photo_url, coach_photo_zoom, coach_photo_x, coach_photo_y").maybeSingle();
  if (error || !data || !data.show_coach || !data.coach_name.trim()) return null;
  return { name: data.coach_name, title: data.coach_title, bio: data.coach_bio, story: data.coach_story, photo: data.coach_photo_url ? { url: data.coach_photo_url, zoom: Number(data.coach_photo_zoom), x: data.coach_photo_x, y: data.coach_photo_y } : null };
}

export type PublicSession = { id: string; weekday: number; start: string; end: string | null; title: string; details: string | null };

/** Horarios de entrenamientos marcados como visibles (se cargan en el panel, «Días y horarios»). */
export async function getTrainingSessions(): Promise<PublicSession[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("trainings");

  const { data, error } = await createAnonClient().from("training_sessions").select("id, weekday, start_time, end_time, title, details").eq("is_active", true).order("weekday").order("start_time");
  if (error) {
    console.error("[entrenamientos] horarios", error.message);
    return [];
  }
  return (data ?? []).map((x) => ({ id: x.id, weekday: x.weekday, start: x.start_time.slice(0, 5), end: x.end_time?.slice(0, 5) ?? null, title: x.title, details: x.details }));
}

export type Proposal = { title: string; subtitle: string; text: string; tags: string[] };
export type Benefit = { icon: string; title: string; text: string };
export type Stat = { value: number; suffix: string; label: string };
export type PageContent = { stats: Stat[]; benefitsTitle: string; benefits: Benefit[]; tagline: string; text: string; proposalsTitle: string; proposals: Proposal[]; showPrices: boolean; showSchedule: boolean };

export const DEFAULT_CONTENT: PageContent = {
  stats: [],
  benefitsTitle: "Entrená mejor, sentite mejor",
  benefits: [],
  tagline: "Entrená. Desarrollá tus capacidades. Evolucioná.",
  text: "Elegí la actividad y cuántos días por semana querés entrenar, dejanos tus datos y los días que te quedan cómodos. Nosotros te contactamos para confirmar los horarios.",
  proposalsTitle: "Propuestas para distintas edades y objetivos",
  proposals: [],
  showPrices: false,
  showSchedule: false,
};

/** Convierte lo guardado (jsonb) en propuestas válidas, descartando lo que no tenga título. */
export function parseProposals(raw: unknown): Proposal[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" ? v : "");
      return { title: str(o.title).trim(), subtitle: str(o.subtitle).trim(), text: str(o.text).trim(), tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string" && t.trim() !== "").map((t) => t.trim()) : [] };
    })
    .filter((p) => p.title !== "");
}

export function parseStats(raw: unknown): Stat[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
      const value = typeof o.value === "number" && Number.isFinite(o.value) ? o.value : NaN;
      return { value, suffix: typeof o.suffix === "string" ? o.suffix.trim() : "", label: typeof o.label === "string" ? o.label.trim() : "" };
    })
    .filter((s) => Number.isFinite(s.value) && s.value >= 0 && s.label !== "")
    .slice(0, 4);
}

export function parseBenefits(raw: unknown): Benefit[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
      return { icon: str(o.icon), title: str(o.title), text: str(o.text) };
    })
    .filter((b) => b.title !== "");
}

/** Textos de la página y qué se muestra (se editan en el panel, «Textos y profe»). */
export async function getPageContent(): Promise<PageContent> {
  "use cache";
  cacheLife("minutes");
  cacheTag("trainings");

  const { data, error } = await createAnonClient().from("training_settings").select("hero_tagline, hero_text, proposals_title, proposals, show_prices, show_schedule, benefits_title, benefits, stats").maybeSingle();
  if (error || !data) return DEFAULT_CONTENT;
  return { stats: parseStats(data.stats), benefitsTitle: data.benefits_title, benefits: parseBenefits(data.benefits), tagline: data.hero_tagline, text: data.hero_text, proposalsTitle: data.proposals_title, proposals: parseProposals(data.proposals), showPrices: data.show_prices, showSchedule: data.show_schedule };
}

export type Testimonial = { id: string; author: string; detail: string | null; body: string; rating: number };

/** Testimonios visibles de una sección: «courts» (inicio, quienes reservan) o «trainings». Sin ninguno, la sección no se muestra. */
export type TestimonialPlacement = "courts" | "trainings";

export async function getTestimonials(placement: TestimonialPlacement): Promise<Testimonial[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("trainings");

  const { data, error } = await createAnonClient().from("training_testimonials").select("id, author, detail, body, rating").eq("is_active", true).eq("placement", placement).order("sort_order").order("created_at", { ascending: false });
  if (error) {
    console.error("[entrenamientos] testimonios", error.message);
    return [];
  }
  return data ?? [];
}
