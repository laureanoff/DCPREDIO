import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente con service role: IGNORA RLS. Usar únicamente en código de servidor
 * (server actions / route handlers) después de validar autorización y datos.
 */
export function createAdminClient() {
  const pub = getPublicEnv();
  const priv = getServerEnv();
  return createClient<Database>(pub.NEXT_PUBLIC_SUPABASE_URL, priv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
