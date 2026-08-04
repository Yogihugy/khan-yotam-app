import { Router } from 'express';
import { composeDisplayName } from '../lib/displayName.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { requestOtp, verifyOtp } from '../services/otp.js';
import { createSessionForUser } from '../services/session.js';

export const authRouter = Router();

const ALLOWED_COLORS = new Set([
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
  '#E67E22',
  '#34495E',
]);

const ALLOWED_TRAVELER_TYPES = new Set(['hiker', 'cyclist', 'staff', 'other']);

function profileComplete(user) {
  return Boolean(user?.traveler_type && user?.name && user?.color);
}

/**
 * POST /auth/register/request-otp
 * Body: { phone }
 * Always returns { ok: true } on success / banned (no leak). Rate limit → 429.
 */
authRouter.post('/register/request-otp', async (req, res, next) => {
  try {
    const result = await requestOtp(req.body?.phone);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/register/verify-otp
 * Body: { phone, code }
 * Same response shape as verify-invite.
 */
authRouter.post('/register/verify-otp', async (req, res, next) => {
  try {
    const result = await verifyOtp(req.body?.phone, req.body?.code);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/verify-invite
 * Body: { token: uuid }
 */
authRouter.post('/verify-invite', async (req, res, next) => {
  try {
    const token = req.body?.token;
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('invite_token', token)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      throw Object.assign(new Error(error.message), { status: 500 });
    }

    if (!user) {
      return res.status(404).json({ error: 'Invalid or used invite token' });
    }

    if (user.invite_expires_at && new Date(user.invite_expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invite has expired' });
    }

    const session = await createSessionForUser(user.id);

    await supabase
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', user.id);

    await supabase.from('activity_log').insert({
      user_id: user.id,
      event_type: 'login',
      metadata: { via: 'verify-invite' },
    });

    return res.json({
      session,
      profile_complete: profileComplete(user),
      user: {
        id: user.id,
        name: user.name,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role,
        traveler_type: user.traveler_type,
        color: user.color,
        status: user.status,
        expires_at: user.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/complete-profile
 * Headers: Authorization: Bearer <access_token>
 * Body: { first_name, last_name?, bio?, social_link?, traveler_type, color }
 * bio / social_link are optional and never part of profile-completeness.
 * name is composed server-side from first_name + last_name (Approach A).
 */
authRouter.post('/complete-profile', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const accessToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!accessToken) {
      return res.status(401).json({ error: 'Missing Authorization Bearer token' });
    }

    const { first_name, last_name, bio, social_link, traveler_type, color } = req.body || {};
    const firstName =
      typeof first_name === 'string' ? first_name.trim() : '';
    const lastName =
      typeof last_name === 'string' ? last_name.trim() : '';
    if (!firstName) {
      return res.status(400).json({ error: 'first_name is required' });
    }
    if (!ALLOWED_TRAVELER_TYPES.has(traveler_type)) {
      return res.status(400).json({
        error: 'traveler_type must be one of hiker|cyclist|staff|other',
      });
    }
    if (!ALLOWED_COLORS.has(color)) {
      return res.status(400).json({ error: 'color is not an allowed option' });
    }

    const bioValue =
      typeof bio === 'string' && bio.trim() ? bio.trim() : null;
    const socialLinkValue =
      typeof social_link === 'string' && social_link.trim()
        ? social_link.trim()
        : null;
    const displayName = composeDisplayName(firstName, lastName);

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const userId = authData.user.id;
    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existingError) {
      throw Object.assign(new Error(existingError.message), { status: 500 });
    }
    if (!existing) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (existing.expires_at && new Date(existing.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Access has expired' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName || null,
        bio: bioValue,
        social_link: socialLinkValue,
        name: displayName,
        traveler_type,
        color,
        invite_token: null,
        invite_expires_at: null,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) {
      throw Object.assign(new Error(updateError.message), { status: 500 });
    }

    return res.json({
      user: {
        id: updated.id,
        name: updated.name,
        first_name: updated.first_name,
        last_name: updated.last_name,
        bio: updated.bio,
        social_link: updated.social_link,
        phone: updated.phone,
        role: updated.role,
        traveler_type: updated.traveler_type,
        color: updated.color,
        status: updated.status,
        expires_at: updated.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
});
