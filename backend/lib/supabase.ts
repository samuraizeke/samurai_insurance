import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Supabase renamed "anon key" to "publishable key" - support both for compatibility
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('  - SUPABASE_URL is not set');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY is not set');
  throw new Error('Missing required Supabase environment variables');
}

/**
 * Service role client - BYPASSES RLS
 * Use ONLY for:
 * - User creation/lookup
 * - Admin operations
 * - Background jobs
 *
 * WARNING: All authorization must be done in application code
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Alias for clarity - same as supabase but named explicitly
 */
export const supabaseAdmin = supabase;

/**
 * Create a user-context Supabase client that respects RLS
 * Use this for user-facing data operations as defense-in-depth
 *
 * @param accessToken - The user's JWT access token
 * @returns SupabaseClient configured with user's auth context
 *
 * NOTE: Requires SUPABASE_PUBLISHABLE_KEY to be set in environment
 */
export function createUserClient(accessToken: string): SupabaseClient {
  if (!supabasePublishableKey) {
    console.warn('⚠️ SUPABASE_PUBLISHABLE_KEY not set - falling back to service role (RLS bypassed)');
    return supabase;
  }

  return createClient(supabaseUrl!, supabasePublishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}