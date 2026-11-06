import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Cliente anónimo sin cookies, para lecturas públicas cacheables. Solo ve lo que RLS permite al público. */
export function createAnonClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
