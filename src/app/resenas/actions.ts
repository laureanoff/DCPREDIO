"use server";

import { after } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStaff } from "@/services/push";

const schema = z.object({
  placement: z.enum(["courts", "trainings"]),
  author: z.string().trim().min(2, "Ingresá tu nombre.").max(80),
  detail: z.string().trim().max(80),
  body: z.string().trim().min(10, "Contanos un poco más (mínimo 10 letras).").max(500, "Máximo 500 letras."),
  rating: z.number().int().min(1, "Elegí cuántas estrellas.").max(5),
  website: z.string().max(200).optional(),
});

export type ReviewResult = { ok: true } | { ok: false; error: string };

/** Reseña enviada por el público. Entra oculta: se publica recién cuando el predio la aprueba en el panel. */
export async function submitReview(input: unknown): Promise<ReviewResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  const v = parsed.data;
  if (v.website) return { ok: true }; // campo trampa para bots: se simula éxito sin guardar nada

  const supabase = createAdminClient();
  const { count } = await supabase.from("training_testimonials").select("id", { count: "exact", head: true }).eq("source", "public").eq("is_active", false);
  if ((count ?? 0) >= 40) return { ok: false, error: "Hay muchas opiniones esperando revisión. Probá de nuevo más tarde." };

  const { error } = await supabase.from("training_testimonials").insert({
    author: v.author, detail: v.detail || null, body: v.body, rating: v.rating, placement: v.placement, is_active: false, source: "public",
    sort_order: Math.floor(Date.now() / 1000) * -1,
  });
  if (error) {
    console.error("[reseñas] alta", error.code, error.message);
    return { ok: false, error: "No pudimos enviar tu opinión. Probá de nuevo en unos minutos." };
  }
  after(() => notifyStaff({ title: "Nueva reseña por aprobar", body: `${v.author} dejó ${v.rating}★`, url: "/admin/entrenamientos?vista=testimonios", tag: "review" }));
  return { ok: true };
}
