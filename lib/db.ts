import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let client: SupabaseClient | null = null;
/** Server-only database client. Uses the service role key, so never import this in browser code. */
export function db(): SupabaseClient {
  if (!client) client = createClient(env.supabaseUrl, env.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
/** Throw on database errors so routes fail loudly instead of silently. */
export function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}
