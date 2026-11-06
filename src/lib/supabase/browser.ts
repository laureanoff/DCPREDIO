import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase para componentes cliente. Solo usa la clave publicable (RLS aplica). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
