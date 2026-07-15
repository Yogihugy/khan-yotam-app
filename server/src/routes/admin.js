import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  addUser,
  extendUserAccess,
  listLocationTrail,
  listUsers,
  softDeleteUser,
} from '../services/adminUsers.js';
import { closeDistressCall, listDistressCalls } from '../services/adminDistress.js';
import { getSupabaseAdmin } from '../lib/supabase.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const PROTOCOL_ID = '00000000-0000-0000-0000-000000000002';
const DUTY_ID = '00000000-0000-0000-0000-000000000001';
const POI_TYPES = new Set(['khan', 'parking', 'water', 'warning', 'other']);

// —— Users ——
adminRouter.get('/users', async (_req, res, next) => {
  try {
    const users = await listUsers({ includeDeleted: false });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/users', async (req, res, next) => {
  try {
    const { name, phone, role } = req.body || {};
    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }
    const result = await addUser({
      name: String(name).trim(),
      phone: String(phone).trim(),
      role: role || 'guest',
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    const result = await softDeleteUser(req.params.id, req.adminUser.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/users/:id/extend', async (req, res, next) => {
  try {
    const days = req.body?.days != null ? Number(req.body.days) : undefined;
    const updated = await extendUserAccess(req.params.id, { days, role: req.body?.role });
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/users/:id/trail', async (req, res, next) => {
  try {
    const hours = Number(req.query.hours || 24);
    const points = await listLocationTrail(req.params.id, { hours });
    res.json({ points });
  } catch (err) {
    next(err);
  }
});

// —— Distress ——
adminRouter.get('/distress', async (req, res, next) => {
  try {
    const openOnly = String(req.query.open || '') === '1';
    const calls = await listDistressCalls({ openOnly });
    res.json({ calls });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/distress/:id/close', async (req, res, next) => {
  try {
    const result = await closeDistressCall(req.params.id, {
      adminId: req.adminUser.id,
      notes: req.body?.notes,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// —— Duty officer ——
adminRouter.get('/duty-officer', async (_req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('duty_officer')
      .select('*')
      .eq('id', DUTY_ID)
      .maybeSingle();
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    res.json({ duty_officer: data });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/duty-officer', async (req, res, next) => {
  try {
    const { name, phone, backup_name, backup_phone } = req.body || {};
    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('duty_officer')
      .upsert({
        id: DUTY_ID,
        name: String(name).trim(),
        phone: String(phone).trim(),
        backup_name: backup_name ? String(backup_name).trim() : null,
        backup_phone: backup_phone ? String(backup_phone).trim() : null,
        set_by: req.adminUser.id,
        set_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    res.json({ duty_officer: data });
  } catch (err) {
    next(err);
  }
});

// —— Protocol ——
adminRouter.get('/protocol', async (_req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('emergency_protocol')
      .select('*')
      .eq('id', PROTOCOL_ID)
      .maybeSingle();
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    res.json({ protocol: data });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/protocol', async (req, res, next) => {
  try {
    const content = req.body?.content;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content is required' });
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('emergency_protocol')
      .upsert({
        id: PROTOCOL_ID,
        content,
        updated_by: req.adminUser.id,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    res.json({ protocol: data });
  } catch (err) {
    next(err);
  }
});

// —— POI ——
adminRouter.get('/poi', async (_req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('poi').select('*').order('created_at', { ascending: false });
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    res.json({ poi: data || [] });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/poi', async (req, res, next) => {
  try {
    const { name, description, lat, lng, type } = req.body || {};
    if (!name || lat == null || lng == null || !type) {
      return res.status(400).json({ error: 'name, lat, lng, type are required' });
    }
    if (!POI_TYPES.has(type)) {
      return res.status(400).json({ error: 'invalid type' });
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('poi')
      .insert({
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        lat: Number(lat),
        lng: Number(lng),
        type,
        created_by: req.adminUser.id,
      })
      .select('*')
      .single();
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    res.status(201).json({ poi: data });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/poi/:id', async (req, res, next) => {
  try {
    const patch = {};
    const { name, description, lat, lng, type } = req.body || {};
    if (name != null) patch.name = String(name).trim();
    if (description !== undefined) patch.description = description ? String(description).trim() : null;
    if (lat != null) patch.lat = Number(lat);
    if (lng != null) patch.lng = Number(lng);
    if (type != null) {
      if (!POI_TYPES.has(type)) return res.status(400).json({ error: 'invalid type' });
      patch.type = type;
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('poi')
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    res.json({ poi: data });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/poi/:id', async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('poi').delete().eq('id', req.params.id);
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// —— Activity log ——
adminRouter.get('/activity-log', async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('activity_log')
      .select('id, user_id, event_type, metadata, created_at, users:user_id(id, name, phone)')
      .order('created_at', { ascending: false })
      .limit(Number(req.query.limit || 200));

    if (req.query.event_type) query = query.eq('event_type', String(req.query.event_type));
    if (req.query.user_id) query = query.eq('user_id', String(req.query.user_id));
    if (req.query.from) query = query.gte('created_at', String(req.query.from));
    if (req.query.to) query = query.lte('created_at', String(req.query.to));

    const { data, error } = await query;
    if (error) throw Object.assign(new Error(error.message), { status: 500 });
    res.json({ events: data || [] });
  } catch (err) {
    next(err);
  }
});
