import { getSupabaseAdmin } from '../lib/supabase.js';
import { sendWhatsAppMessage } from './whatsapp.js';

const DUTY_OFFICER_ID = '00000000-0000-0000-0000-000000000001';

function formatDistressMessage({ name, phone, lat, lng, dutyOfficerName, timeLabel }) {
  const mapsUrl =
    lat != null && lng != null
      ? `https://maps.google.com/?q=${lat},${lng}`
      : 'location unavailable';

  return [
    '🆘 DISTRESS ALERT',
    `Name: ${name} | Phone: ${phone}`,
    `Location: ${mapsUrl}`,
    `Duty officer: ${dutyOfficerName || '—'}`,
    `Time: ${timeLabel}`,
  ].join('\n');
}

/**
 * Idempotent distress handling via client_request_id unique constraint.
 */
export async function handleDistressAlert({
  userId,
  clientRequestId,
  lat,
  lng,
}) {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: existingError } = await supabase
    .from('distress_calls')
    .select('id, whatsapp_sent')
    .eq('client_request_id', clientRequestId)
    .maybeSingle();

  if (existingError) {
    throw Object.assign(new Error(existingError.message), { status: 500 });
  }

  if (existing) {
    return {
      ok: true,
      id: existing.id,
      whatsapp_sent: existing.whatsapp_sent,
      duplicate: true,
    };
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, phone, is_deleted, expires_at')
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    throw Object.assign(new Error(userError.message), { status: 500 });
  }
  if (!user || user.is_deleted) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  if (user.expires_at && new Date(user.expires_at) < new Date()) {
    throw Object.assign(new Error('Access has expired'), { status: 403 });
  }

  const { data: duty, error: dutyError } = await supabase
    .from('duty_officer')
    .select('name, phone, backup_name, backup_phone')
    .eq('id', DUTY_OFFICER_ID)
    .maybeSingle();

  if (dutyError) {
    throw Object.assign(new Error(dutyError.message), { status: 500 });
  }

  const triggeredAt = new Date();
  const timeLabel = triggeredAt.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const { data: inserted, error: insertError } = await supabase
    .from('distress_calls')
    .insert({
      client_request_id: clientRequestId,
      user_id: userId,
      lat: lat ?? null,
      lng: lng ?? null,
      triggered_at: triggeredAt.toISOString(),
      whatsapp_sent: false,
    })
    .select('id')
    .single();

  if (insertError) {
    // Race: another request inserted the same client_request_id
    if (insertError.code === '23505') {
      const { data: raced } = await supabase
        .from('distress_calls')
        .select('id, whatsapp_sent')
        .eq('client_request_id', clientRequestId)
        .maybeSingle();
      return {
        ok: true,
        id: raced?.id,
        whatsapp_sent: raced?.whatsapp_sent ?? false,
        duplicate: true,
      };
    }
    throw Object.assign(new Error(insertError.message), { status: 500 });
  }

  const messageText = formatDistressMessage({
    name: user.name,
    phone: user.phone,
    lat,
    lng,
    dutyOfficerName: duty?.name,
    timeLabel,
  });

  const recipients = [
    duty?.phone,
    duty?.backup_phone,
  ].filter(Boolean);

  let whatsappSent = false;
  const whatsappResults = [];

  for (const phone of recipients) {
    try {
      const result = await sendWhatsAppMessage({ phone, messageText });
      whatsappResults.push({ phone, ...result });
      if (result?.ok) whatsappSent = true;
    } catch (err) {
      whatsappResults.push({
        phone,
        ok: false,
        error: err instanceof Error ? err.message : 'send failed',
      });
    }
  }

  // If no duty phones configured, still mark mock path as handled in logs
  if (recipients.length === 0) {
    console.log('[distress] no duty officer phones configured', { userId, messageText });
    whatsappSent = true;
  }

  await supabase
    .from('distress_calls')
    .update({ whatsapp_sent: whatsappSent })
    .eq('id', inserted.id);

  await supabase.from('activity_log').insert({
    user_id: userId,
    event_type: 'distress',
    metadata: {
      distress_id: inserted.id,
      client_request_id: clientRequestId,
      lat,
      lng,
      whatsapp_sent: whatsappSent,
      whatsapp_results: whatsappResults,
    },
  });

  return {
    ok: true,
    id: inserted.id,
    whatsapp_sent: whatsappSent,
    duplicate: false,
    mocked: whatsappResults.some((r) => r.mocked),
  };
}
