import { createInvitedUser } from './invites.js';
import { expiresAtForRole } from '../config.js';
import { getSupabaseAdmin } from '../lib/supabase.js';

export async function listUsers({ includeDeleted = false } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('users')
    .select(
      'id, name, phone, role, traveler_type, status, color, last_seen_at, last_location_at, created_at, expires_at, is_deleted',
    )
    .order('created_at', { ascending: false });

  if (!includeDeleted) {
    query = query.eq('is_deleted', false);
  }

  const { data, error } = await query;
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data || [];
}

export async function addUser({ name, phone, role }) {
  return createInvitedUser({ name, phone, role, sendWhatsApp: true });
}

export async function softDeleteUser(userId, adminId) {
  const supabase = getSupabaseAdmin();
  const { data: user, error } = await supabase
    .from('users')
    .select('id, role, is_deleted')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  if (!user || user.is_deleted) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  if (user.id === adminId) {
    throw Object.assign(new Error('Cannot remove yourself'), { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({
      is_deleted: true,
      status: 'offline',
      invite_token: null,
      invite_expires_at: null,
    })
    .eq('id', userId);

  if (updateError) throw Object.assign(new Error(updateError.message), { status: 500 });

  await supabase.auth.admin.signOut(userId, 'global').catch(() => undefined);
  await supabase.from('activity_log').insert({
    user_id: userId,
    event_type: 'logout',
    metadata: { via: 'admin_remove', by: adminId },
  });

  return { ok: true };
}

export async function extendUserAccess(userId, { days, role } = {}) {
  const supabase = getSupabaseAdmin();
  const { data: user, error } = await supabase
    .from('users')
    .select('id, role, is_deleted')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  if (!user || user.is_deleted) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  let expiresAt;
  if (typeof days === 'number' && days > 0) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    expiresAt = d.toISOString();
  } else {
    expiresAt = expiresAtForRole(role || user.role);
  }

  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({ expires_at: expiresAt, status: 'active' })
    .eq('id', userId)
    .select('id, name, phone, role, expires_at, status')
    .single();

  if (updateError) throw Object.assign(new Error(updateError.message), { status: 500 });
  return updated;
}

export async function listLocationTrail(userId, { hours = 24 } = {}) {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('location_history')
    .select('lat, lng, accuracy, recorded_at')
    .eq('user_id', userId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data || [];
}
