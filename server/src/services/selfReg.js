import { randomUUID } from 'crypto';
import { normalizeToE164 } from '../lib/phone.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { expiresAtForRole } from '../config.js';

/** Guest placeholder name: אורח */
const PLACEHOLDER_NAME = '\u05D0\u05D5\u05E8\u05D7';
const DEFAULT_COLOR = '#3498DB';

/**
 * Creates auth.users + public.users for a self-registered guest (no invite token).
 */
export async function createAuthPublicGuest({ phone, name = PLACEHOLDER_NAME }) {
  const e164 = normalizeToE164(phone);
  if (!e164 || !/^\+\d{8,15}$/.test(e164)) {
    throw Object.assign(new Error('Invalid phone number'), { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const email = `u_${randomUUID().replace(/-/g, '')}@users.khanyotam.local`;
  const password = randomUUID();

  const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { phone: e164, name, role: 'guest' },
  });

  if (createError || !authUser?.user) {
    throw Object.assign(new Error(createError?.message || 'Failed to create auth user'), {
      status: 500,
    });
  }

  const userId = authUser.user.id;
  const row = {
    id: userId,
    name,
    phone: e164,
    role: 'guest',
    status: 'active',
    color: DEFAULT_COLOR,
    traveler_type: null,
    expires_at: expiresAtForRole('guest'),
    invite_token: null,
    invite_expires_at: null,
    is_deleted: false,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('users')
    .insert(row)
    .select('*')
    .single();

  if (insertError) {
    await supabase.auth.admin.deleteUser(userId);
    throw Object.assign(new Error(insertError.message), { status: 500 });
  }

  return inserted;
}

/**
 * Resolve or create a public.users row for self-registration / OTP login.
 * @returns {{ user: object, outcome: 'login' | 'reconnect' | 'created' }}
 */
export async function ensureSelfRegUser(phone) {
  const e164 = normalizeToE164(phone);
  if (!e164 || !/^\+\d{8,15}$/.test(e164)) {
    throw Object.assign(new Error('Invalid phone number'), { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', e164)
    .maybeSingle();

  if (error) {
    throw Object.assign(new Error(error.message), { status: 500 });
  }

  if (!existing) {
    const user = await createAuthPublicGuest({ phone: e164, name: PLACEHOLDER_NAME });
    return { user, outcome: 'created' };
  }

  if (!existing.is_deleted) {
    return { user: existing, outcome: 'login' };
  }

  const { data: reconnected, error: updateError } = await supabase
    .from('users')
    .update({
      is_deleted: false,
      status: 'active',
      expires_at: expiresAtForRole('guest'),
      invite_token: null,
      invite_expires_at: null,
    })
    .eq('id', existing.id)
    .select('*')
    .single();

  if (updateError) {
    throw Object.assign(new Error(updateError.message), { status: 500 });
  }

  return { user: reconnected, outcome: 'reconnect' };
}
