import { Router } from 'express';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { handleDistressAlert } from '../services/distress.js';

export const distressRouter = Router();

/**
 * POST /api/distress
 * Headers: Authorization: Bearer <access_token>
 * Body: { client_request_id: uuid, lat?: number, lng?: number }
 */
distressRouter.post('/distress', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const accessToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!accessToken) {
      return res.status(401).json({ error: 'Missing Authorization Bearer token' });
    }

    const clientRequestId = req.body?.client_request_id;
    if (!clientRequestId || typeof clientRequestId !== 'string') {
      return res.status(400).json({ error: 'client_request_id is required' });
    }

    const lat = req.body?.lat;
    const lng = req.body?.lng;
    if (lat != null && typeof lat !== 'number') {
      return res.status(400).json({ error: 'lat must be a number' });
    }
    if (lng != null && typeof lng !== 'number') {
      return res.status(400).json({ error: 'lng must be a number' });
    }

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const result = await handleDistressAlert({
      userId: authData.user.id,
      clientRequestId,
      lat: lat ?? null,
      lng: lng ?? null,
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
