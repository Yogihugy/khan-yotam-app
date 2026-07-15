const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const appConfig = {
  supabaseUrl: supabaseUrl || '',
  supabaseAnonKey: supabaseAnonKey || '',
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3001',
  khanLat: Number(import.meta.env.VITE_KHAN_LAT || 32.6905),
  khanLng: Number(import.meta.env.VITE_KHAN_LNG || 34.9433),
  appName: (import.meta.env.VITE_APP_NAME as string | undefined) || 'Khan Yotam',
};

export function assertClientEnv() {
  if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey) {
    console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }
}
