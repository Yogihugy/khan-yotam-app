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

export async function listBannedPhones() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('banned_phones')
    .select('phone, banned_at, banned_by, reason, banned_by_user:banned_by(id, name)')
    .order('banned_at', { ascending: false });

  if (error) {
    throw Object.assign(new Error(error.message), { status: 500 });
  }

  return data || [];
}

/**
 * Removes the ban row only. Does not clear permanently_removed on any user.
 */
export async function unbanPhone(phone) {
  const normalized = normalizeToE164(phone);
  if (!normalized || !/^\+\d{8,15}$/.test(normalized)) {
    throw Object.assign(new Error('Invalid phone number'), { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('banned_phones')
    .delete()
    .eq('phone', normalized)
    .select('phone')
    .maybeSingle();

  if (error) {
    throw Object.assign(new Error(error.message), { status: 500 });
  }
  if (!data) {
    throw Object.assign(new Error('Ban not found'), { status: 404 });
  }

  return { ok: true };
}
