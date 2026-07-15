export function requireEnv(keys) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export function getConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    appUrl: process.env.APP_URL || 'http://localhost:5173',
    guestSessionDays: Number(process.env.GUEST_SESSION_DAYS || 15),
    staffSessionDays: Number(process.env.STAFF_SESSION_DAYS || 365),
    wati: {
      endpoint: process.env.WATI_API_ENDPOINT || '',
      apiKey: process.env.WATI_API_KEY || '',
      mock: String(process.env.WATI_MOCK || 'false').toLowerCase() === 'true',
      inviteTemplateName: process.env.WATI_INVITE_TEMPLATE_NAME || 'invite_sea_trail',
      inviteTemplateLanguage: process.env.WATI_INVITE_TEMPLATE_LANGUAGE || 'he',
    },
  };
}

export function expiresAtForRole(role) {
  const { guestSessionDays, staffSessionDays } = getConfig();
  if (role === 'admin') return null;
  const days = role === 'staff' ? staffSessionDays : guestSessionDays;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}
