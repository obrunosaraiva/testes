import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role — BYPASS RLS.
 * Usar APENAS em código server-side confiável:
 *   - webhooks (Stripe, Evolution)
 *   - background workers
 *   - operações administrativas
 * NUNCA expor no browser nem em código cliente.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
