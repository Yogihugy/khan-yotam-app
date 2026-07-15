import { getSupabaseAdmin } from '../lib/supabase.js';

/**
 * Express middleware: requires Bearer session belonging to a non-deleted admin.
 * Sets req.adminUser = { id, name, role }.
 */
export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const accessToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!accessToken) {
      return res.status(401).json({ error: 'Missing Authorization Bearer token' });
    }

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, role, is_deleted')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (userError) {
      return res.status(500).json({ error: userError.message });
    }
    if (!user || user.is_deleted || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.adminUser = { id: user.id, name: user.name, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}
