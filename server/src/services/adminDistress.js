import { getSupabaseAdmin } from '../lib/supabase.js';

export async function listDistressCalls({ openOnly = false, limit = 100 } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('distress_calls')
    .select(
      'id, client_request_id, user_id, lat, lng, triggered_at, closed_at, closed_by, notes, whatsapp_sent, users:user_id(id, name, phone, role, traveler_type, color)',
    )
    .order('triggered_at', { ascending: false })
    .limit(limit);

  if (openOnly) {
    query = query.is('closed_at', null);
  }

  const { data, error } = await query;
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data || [];
}

export async function closeDistressCall(id, { adminId, notes }) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error } = await supabase
    .from('distress_calls')
    .select('id, closed_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  if (!existing) throw Object.assign(new Error('Distress call not found'), { status: 404 });
  if (existing.closed_at) {
    return { ok: true, alreadyClosed: true };
  }

  const { data: updated, error: updateError } = await supabase
    .from('distress_calls')
    .update({
      closed_at: new Date().toISOString(),
      closed_by: adminId,
      notes: notes || null,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) throw Object.assign(new Error(updateError.message), { status: 500 });
  return { ok: true, call: updated };
}
