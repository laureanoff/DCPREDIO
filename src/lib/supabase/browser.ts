import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/** Cliente Supabase para componentes cliente. Solo usa la clave publicable (RLS aplica). */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
