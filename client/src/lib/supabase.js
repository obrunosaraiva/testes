import { createClient } from '@supabase/supabase-js';

// Credentials come from environment variables only.
// For local dev: copy client/.env.example → client/.env and fill in your values.
// For production (Railway): set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the dashboard.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('[Supabase] VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não definidas. Configure o arquivo .env.');
}

export const sb = createClient(url, key);
