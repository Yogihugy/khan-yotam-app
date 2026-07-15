import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from './config';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey) {
      throw new Error('Supabase env vars are not configured');
    }
    client = createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: localStorage,
        storageKey: 'khan-yotam-auth',
      },
    });
  }
  return client;
}

export async function setSessionFromTokens(session: Session) {
  const supabase = getSupabase();
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
}

export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
