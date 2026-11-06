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
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  WHATSAPP_VENUE_NUMBER: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default("v21.0"),
  WHATSAPP_TEMPLATE_VENUE: z.string().optional(),
  WHATSAPP_TEMPLATE_CUSTOMER: z.string().optional(),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default("es_AR"),
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
