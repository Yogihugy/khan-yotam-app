import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { expiresAtForRole, getConfig } from '../config.js';
import { sendInviteWhatsApp } from './whatsapp.js';

/**
 * Creates auth.users + public.users with a fresh invite token.
 * Used by seed helper scripts and Phase D admin user management.
 */
export async function createInvitedUser({
  name,
  phone,
  role = 'guest',
  sendWhatsApp = true,
}) {
  if (!['guest', 'staff', 'admin'].includes(role)) {
    throw Object.assign(new Error('Invalid role'), { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const inviteToken = randomUUID();
  const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .eq('is_deleted', false)
    .maybeSingle();

  if (existingError) {
    throw Object.assign(new Error(existingError.message), { status: 500 });
  }

  let userId;

  if (existing) {
    userId = existing.id;
    const { error: updateError } = await supabase
      .from('users')
      .update({
        name,
        role,
        status: 'active',
        expires_at: expiresAtForRole(role),
        invite_token: inviteToken,
        invite_expires_at: inviteExpiresAt,
      })
      .eq('id', userId);

    if (updateError) {
      throw Object.assign(new Error(updateError.message), { status: 500 });
    }
  } else {
    const email = `u_${randomUUID().replace(/-/g, '')}@users.khanyotam.local`;
    const password = randomUUID();

    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { phone, name, role },
    });

    if (createError || !authUser?.user) {
      throw Object.assign(new Error(createError?.message || 'Failed to create auth user'), {
        status: 500,
      });
    }

    userId = authUser.user.id;
    const row = {
      id: userId,
      name,
      phone,
      role,
      status: 'active',
      color: '#3498DB',
      expires_at: expiresAtForRole(role),
      invite_token: inviteToken,
      invite_expires_at: inviteExpiresAt,
      is_deleted: false,
    };

    const { error: insertError } = await supabase.from('users').insert(row);
    if (insertError) {
      await supabase.auth.admin.deleteUser(userId);
      throw Object.assign(new Error(insertError.message), { status: 500 });
    }
  }

  const { appUrl } = getConfig();
  const inviteUrl = `${appUrl.replace(/\/$/, '')}/invite/${inviteToken}`;

  let whatsapp = null;
  if (sendWhatsApp) {
    whatsapp = await sendInviteWhatsApp({ phone, inviteUrl, name });
    await supabase.from('activity_log').insert({
      user_id: userId,
      event_type: 'invite_sent',
      metadata: { phone, invite_url: inviteUrl, mocked: whatsapp?.mocked ?? false },
    });
  }

  return {
    userId,
    inviteToken,
    inviteUrl,
    inviteExpiresAt,
    whatsapp,
  };
}
