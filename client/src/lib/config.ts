const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function parseLatLngPair(raw: string | undefined, fallback: [number, number]): [number, number] {
  if (!raw) return fallback;
  const [a, b] = raw.split(',').map((s) => Number(s.trim()));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return fallback;
  return [a, b];
}

export const appConfig = {
  supabaseUrl: supabaseUrl || '',
  supabaseAnonKey: supabaseAnonKey || '',
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3001',
  khanLat: Number(import.meta.env.VITE_KHAN_LAT || 32.6905),
  khanLng: Number(import.meta.env.VITE_KHAN_LNG || 34.9433),
  mapBoundsSw: parseLatLngPair(import.meta.env.VITE_MAP_BOUNDS_SW as string | undefined, [32.48, 34.88]),
  mapBoundsNe: parseLatLngPair(import.meta.env.VITE_MAP_BOUNDS_NE as string | undefined, [32.82, 34.98]),
  appName: (import.meta.env.VITE_APP_NAME as string | undefined) || 'Chan Yotam',
};

export function assertClientEnv() {
  if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey) {
    console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }
}
