import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { isPhoneBanned } from '../lib/bans.js';
import { normalizeToE164 } from '../lib/phone.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { sendSmsMessage } from './sms.js';
import { ensureSelfRegUser } from './selfReg.js';
import { createSessionForUser } from './session.js';

const COOLDOWN_MS = 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60 * 1000;

function genericOtpFail() {
  return Object.assign(new Error('Invalid or expired code'), { status: 401 });
}

function getPepper() {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) {
    throw Object.assign(new Error('OTP_PEPPER is not configured'), { status: 500 });
  }
  return pepper;
}

export function hashOtpCode(code) {
  return createHash('sha256').update(`${code}:${getPepper()}`).digest('hex');
}

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function codesMatch(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function deleteOtpRow(supabase, phone) {
  await supabase.from('otp_codes').delete().eq('phone', phone);
}

/**
 * Rate-limit / ban-aware OTP send for self-registration.
 * Returns { ok: true } on success and when banned (no SMS, same shape).
 * Throws status 400 (invalid phone), 429 (rate limit), or 500.
 */
export async function requestOtp(rawPhone) {
  const phone = normalizeToE164(rawPhone);
  if (!phone || !/^\+\d{8,15}$/.test(phone)) {
    throw Object.assign(new Error('Invalid phone number'), { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: loadError } = await supabase
    .from('otp_codes')
    .select('last_sent_at, send_count_hour, hour_window_start')
    .eq('phone', phone)
    .maybeSingle();

  if (loadError) {
    throw Object.assign(new Error(loadError.message), { status: 500 });
  }

  const now = Date.now();

  let sendCountHour = 1;
  let hourWindowStartMs = now;

  if (existing) {
    const lastSent = new Date(existing.last_sent_at).getTime();
    if (Number.isFinite(lastSent) && now - lastSent < COOLDOWN_MS) {
      throw Object.assign(new Error('Please wait before requesting another code'), {
        status: 429,
      });
    }

    let sendCount = existing.send_count_hour ?? 0;
    let windowStart = new Date(existing.hour_window_start).getTime();
    if (!Number.isFinite(windowStart) || now - windowStart >= HOUR_MS) {
      sendCount = 0;
      windowStart = now;
    }
    if (sendCount >= MAX_SENDS_PER_HOUR) {
      throw Object.assign(new Error('Too many code requests. Try again later'), {
        status: 429,
      });
    }
    sendCountHour = sendCount + 1;
    hourWindowStartMs = windowStart;
  }

  // Never reveal ban status — same success shape, no SMS / no otp row write.
  if (await isPhoneBanned(phone)) {
    return { ok: true };
  }

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(now + OTP_TTL_MS).toISOString();
  const sentAt = new Date(now).toISOString();

  const { error: upsertError } = await supabase.from('otp_codes').upsert(
    {
      phone,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempt_count: 0,
      last_sent_at: sentAt,
      send_count_hour: sendCountHour,
      hour_window_start: new Date(hourWindowStartMs).toISOString(),
    },
    { onConflict: 'phone' },
  );

  if (upsertError) {
    throw Object.assign(new Error(upsertError.message), { status: 500 });
  }

  await sendSmsMessage({
    phone,
    messageText: `קוד האימות שלך לחאן יותם: ${code}`,
  });

  return { ok: true };
}

/**
 * Verify SMS OTP and mint a session (login / reconnect / create).
 * Returns the same shape as verify-invite: { session, profile_complete, user }.
 */
export async function verifyOtp(rawPhone, rawCode) {
  const phone = normalizeToE164(rawPhone);
  if (!phone || !/^\+\d{8,15}$/.test(phone)) {
    throw Object.assign(new Error('Invalid phone number'), { status: 400 });
  }

  const code = String(rawCode ?? '').trim();
  if (!/^\d{6}$/.test(code)) {
    throw genericOtpFail();
  }

  const supabase = getSupabaseAdmin();
  const { data: row, error: loadError } = await supabase
    .from('otp_codes')
    .select('phone, code_hash, expires_at, attempt_count')
    .eq('phone', phone)
    .maybeSingle();

  if (loadError) {
    throw Object.assign(new Error(loadError.message), { status: 500 });
  }

  if (!row) {
    throw genericOtpFail();
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await deleteOtpRow(supabase, phone);
    throw genericOtpFail();
  }

  if ((row.attempt_count ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    await deleteOtpRow(supabase, phone);
    throw genericOtpFail();
  }

  const expectedHash = hashOtpCode(code);
  if (!codesMatch(expectedHash, row.code_hash)) {
    const nextAttempts = (row.attempt_count ?? 0) + 1;
    if (nextAttempts >= MAX_VERIFY_ATTEMPTS) {
      await deleteOtpRow(supabase, phone);
    } else {
      const { error: bumpError } = await supabase
        .from('otp_codes')
        .update({ attempt_count: nextAttempts })
        .eq('phone', phone);
      if (bumpError) {
        throw Object.assign(new Error(bumpError.message), { status: 500 });
      }
    }
    throw genericOtpFail();
  }

  await deleteOtpRow(supabase, phone);

  if (await isPhoneBanned(phone)) {
    throw genericOtpFail();
  }

  const { user, outcome } = await ensureSelfRegUser(phone);
  const session = await createSessionForUser(user.id);

  const { data: updated, error: seenError } = await supabase
    .from('users')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('*')
    .single();

  if (seenError) {
    throw Object.assign(new Error(seenError.message), { status: 500 });
  }

  await supabase.from('activity_log').insert({
    user_id: user.id,
    event_type: 'login',
    metadata: { via: 'register-otp', outcome },
  });

  const profileUser = updated || user;
  return {
    session,
    profile_complete: Boolean(
      profileUser?.traveler_type && profileUser?.name && profileUser?.color,
    ),
    user: {
      id: profileUser.id,
      name: profileUser.name,
      phone: profileUser.phone,
      role: profileUser.role,
      traveler_type: profileUser.traveler_type,
      color: profileUser.color,
      status: profileUser.status,
      expires_at: profileUser.expires_at,
    },
  };
}
