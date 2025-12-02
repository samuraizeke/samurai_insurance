import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error("Missing Supabase URL environment variable");
}

if (!supabaseServiceKey) {
  throw new Error("Missing Supabase service key environment variable");
}

export const createSupabaseServerClient = () =>
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
