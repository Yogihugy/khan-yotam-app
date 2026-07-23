import { getSupabaseAdmin } from './supabase.js';
import { normalizeToE164 } from './phone.js';

/**
 * Returns true if the phone is on the permanent ban list.
 * Lookup uses E.164 so invite/OTP inputs in local IL form still match stored bans.
 * Unban is simply deleting the row from banned_phones (no soft-unban in v1).
 */
export async function isPhoneBanned(phone) {
  const normalized = normalizeToE164(phone);
  if (!normalized) return false;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('banned_phones')
    .select('phone')
    .eq('phone', normalized)
    .maybeSingle();

  if (error) {
    throw Object.assign(new Error(error.message), { status: 500 });
  }

  return Boolean(data);
}
