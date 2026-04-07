import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://imsqnoxztoxlmiumdalu.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltc3Fub3h6dG94bG1pdW1kYWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTk5NTEsImV4cCI6MjA5MDQ3NTk1MX0.CaFrcNJokpvdRD9v9AIp3rlDd8wXIrW6k1urepMDnqw';

export const sb = createClient(url, key);
