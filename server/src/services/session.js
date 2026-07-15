import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { getConfig } from '../config.js';

/**
 * Mints a Supabase session for an existing auth user via magic-link token exchange.
 */
export async function createSessionForUser(userId) {
  const admin = getSupabaseAdmin();
  const { supabaseUrl, supabaseAnonKey } = getConfig();

  if (!supabaseAnonKey) {
    throw Object.assign(new Error('SUPABASE_ANON_KEY is required to mint sessions'), {
      status: 500,
    });
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError || !userData?.user) {
    throw Object.assign(new Error('Auth user not found'), { status: 500 });
  }

  const email = userData.user.email;
  if (!email) {
    throw Object.assign(new Error('Auth user missing email for session mint'), { status: 500 });
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (linkError || !linkData) {
    throw Object.assign(new Error(linkError?.message || 'Failed to generate session link'), {
      status: 500,
    });
  }

  const tokenHash = linkData.properties?.hashed_token;
  if (!tokenHash) {
    throw Object.assign(new Error('Missing hashed_token from generateLink'), { status: 500 });
  }

  const anon = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sessionData, error: otpError } = await anon.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });

  if (otpError || !sessionData?.session) {
    throw Object.assign(new Error(otpError?.message || 'Failed to create session'), {
      status: 500,
    });
  }

  return sessionData.session;
}
