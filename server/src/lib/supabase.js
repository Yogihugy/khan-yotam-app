import { createClient } from '@supabase/supabase-js';
import { getConfig } from '../config.js';

let adminClient;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;
  const { supabaseUrl, supabaseServiceRoleKey } = getConfig();
  adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return adminClient;
}
