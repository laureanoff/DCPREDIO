import { z } from "zod";

/** Variables públicas (se pueden usar en el navegador). */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

/** Variables privadas: SOLO servidor. Nunca importar este módulo desde componentes cliente. */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
});

export function getPublicEnv() {
  return publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
}

export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() no puede ejecutarse en el navegador.");
  }
  return serverSchema.parse(process.env);
}
