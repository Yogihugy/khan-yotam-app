import { getSupabase } from './supabase';

export type PoiType =
  | 'khan'
  | 'guesthouse'
  | 'water'
  | 'parking'
  | 'warning'
  | 'viewpoint'
  | 'shopping'
  | 'cafe'
  | 'art'
  | 'cave'
  | 'diving'
  | 'beach'
  | 'historic'
  | 'picnic'
  | 'hiking'
  | 'gas'
  | 'first_aid'
  | 'maapilim'
  | 'other';

export type PoiRow = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  type: PoiType;
};

/** Full inline SVG badge markup per POI type (opaque rounded-square icons). */
export const POI_ICONS: Record<PoiType, string> = {
  khan: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#D97706"/><path d="M 50,22 L 20,48 H 28 V 78 H 72 V 48 H 80 Z" fill="#FFFFFF"/><path d="M 42,78 V 56 H 58 V 78 Z" fill="#D97706"/><rect x="42" y="36" width="16" height="12" rx="2" fill="#D97706"/></svg>`,
  guesthouse: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#4B5563"/><path d="M 20,78 V 38 L 50,22 L 80,38 V 78 Z" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linejoin="round"/><path d="M 35,38 C 35,28 65,28 65,38" fill="none" stroke="#FFFFFF" stroke-width="4"/><path d="M 38,78 V 54 H 62 V 78 Z" fill="#FFFFFF"/><line x1="50" y1="54" x2="50" y2="78" stroke="#4B5563" stroke-width="3"/></svg>`,
  water: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#0284C7"/><circle cx="34" cy="32" r="6" fill="#FFFFFF"/><path d="M 32,44 C 40,38 52,48 64,40 L 76,46" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M 18,62 C 28,58 38,66 48,62 C 58,58 68,66 78,62" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/><path d="M 18,76 C 28,72 38,80 48,76 C 58,72 68,80 78,76" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/></svg>`,
  parking: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#2563EB"/><path d="M 34,22 H 54 C 66,22 74,28 74,40 C 74,52 66,58 54,58 H 48 V 78 H 34 Z M 48,34 V 46 H 54 C 58,46 61,44 61,40 C 61,36 58,34 54,34 Z" fill="#FFFFFF"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#EA580C"/><path d="M 50,18 L 86,80 H 14 Z" fill="#FFFFFF"/><path d="M 50,38 V 58" stroke="#EA580C" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="70" r="4" fill="#EA580C"/></svg>`,
  viewpoint: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#15803D"/><path d="M 18,72 L 38,36 L 52,60 L 68,30 L 84,72 Z" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="58" cy="24" r="6" fill="#FFFFFF"/></svg>`,
  shopping: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#CA8A04"/><path d="M 20,24 H 32 L 38,62 H 76 L 82,34 H 42" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="44" cy="74" r="4.5" fill="#FFFFFF"/><circle cx="70" cy="74" r="4.5" fill="#FFFFFF"/><path d="M 32,24 L 28,16" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/></svg>`,
  cafe: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#6F2232"/><path d="M 30,42 L 30,62 C 30,70 38,76 48,76 C 58,76 66,70 66,62 L 66,42 Z" fill="#FFFFFF"/><path d="M 66,46 H 72 C 77,46 80,50 80,55 C 80,60 77,64 72,64 H 66 Z" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/><path d="M 24,80 H 72" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/><path d="M 38,34 C 36,28 42,26 40,20" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" fill="none"/><path d="M 48,34 C 46,28 52,26 50,20" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" fill="none"/><path d="M 58,34 C 56,28 62,26 60,20" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" fill="none"/></svg>`,
  art: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#5E2573"/><path d="M 50 20 C 30 20 18 32 18 52 C 18 70 32 80 50 80 C 58 80 62 74 62 68 C 62 64 60 62 64 58 C 68 54 82 58 82 50 C 82 32 70 20 50 20 Z" fill="#FFFFFF"/><circle cx="34" cy="36" r="4.5" fill="#5E2573"/><circle cx="48" cy="30" r="4.5" fill="#5E2573"/><circle cx="64" cy="36" r="4.5" fill="#5E2573"/><circle cx="32" cy="52" r="4.5" fill="#5E2573"/><circle cx="52" cy="70" r="4.5" fill="#5E2573"/><path d="M 72 22 L 80 30 L 52 64 L 44 64 L 44 56 Z" fill="#FFFFFF" stroke="#5E2573" stroke-width="1.5"/></svg>`,
  cave: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#6E2325"/><path d="M 18,78 L 38,32 L 54,58 L 68,26 L 84,78 Z" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="38" cy="52" r="3" fill="#FFFFFF"/><path d="M 38,55 L 38,68 M 38,60 L 32,66 M 38,60 L 44,66 M 38,68 L 33,76 M 38,68 L 43,76" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/><circle cx="62" cy="48" r="3" fill="#FFFFFF"/><path d="M 62,51 L 62,64 M 62,56 L 56,62 M 62,56 L 70,52 M 62,64 L 57,72 M 62,64 L 67,72" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  diving: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#11698E"/><path d="M 24,42 C 24,35 32,32 46,32 C 50,32 50,35 50,35 C 50,35 50,32 54,32 C 68,32 76,35 76,42 C 78,54 74,62 50,62 C 26,62 22,54 24,42 Z" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linejoin="round"/><path d="M 28,43 C 28,38 34,36 45,36 C 47,36 47,56 42,56 C 32,56 28,50 28,43 Z" fill="#FFFFFF" opacity="0.3"/><path d="M 72,43 C 72,38 66,36 55,36 C 53,36 53,56 58,56 C 68,56 72,50 72,43 Z" fill="#FFFFFF" opacity="0.3"/><path d="M 70,50 C 82,50 82,30 82,20" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/><path d="M 82,20 H 76" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/></svg>`,
  beach: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#C82323"/><path d="M 22,46 C 22,28 78,28 78,46 Z" fill="#FFFFFF"/><path d="M 50,46 L 50,78 C 50,81 46,81 46,78" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/><path d="M 22,46 C 30,50 36,46 50,46 C 64,46 70,50 78,46" fill="none" stroke="#C82323" stroke-width="3"/><path d="M 50,28 L 50,22" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/></svg>`,
  historic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#5E2573"/><path d="M 30,78 V 50 L 50,32 L 70,50 V 78 Z" fill="#FFFFFF"/><path d="M 50,20 V 32 M 44,24 H 56" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/><path d="M 44,78 V 62 C 44,58 56,58 56,62 V 78 Z" fill="#5E2573"/></svg>`,
  picnic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#6E2325"/><path d="M 20,54 H 60 M 26,54 L 20,76 M 54,54 L 60,76 M 16,62 H 64" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M 76,32 L 64,52 H 88 L 76,32 Z M 76,48 L 68,62 H 84 L 76,48 Z" fill="#FFFFFF"/><rect x="73" y="62" width="6" height="14" fill="#FFFFFF"/></svg>`,
  hiking: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#5D3A1A"/><path d="M 20,62 C 20,56 24,52 32,52 H 42 L 50,62 H 68 C 72,62 76,66 76,70 C 76,74 72,76 68,76 H 24 C 20,76 20,70 20,62 Z" fill="#FFFFFF"/><path d="M 24,76 V 80 M 34,76 V 80 M 44,76 V 80 M 54,76 V 80 M 64,76 V 80" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/><path d="M 72,24 H 88 L 82,32 L 88,40 H 72 Z" fill="#FFFFFF"/><rect x="70" y="20" width="4" height="32" fill="#FFFFFF"/></svg>`,
  gas: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#11698E"/><rect x="26" y="32" width="32" height="46" rx="4" fill="#FFFFFF"/><rect x="32" y="38" width="20" height="14" rx="2" fill="#11698E"/><path d="M 58,40 H 66 C 70,40 72,44 72,50 V 68 C 72,72 76,72 76,68 V 52 L 70,46" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><rect x="22" y="78" width="40" height="4" rx="2" fill="#FFFFFF"/></svg>`,
  first_aid: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#C82323"/><path d="M 40,24 H 60 V 40 H 76 V 60 H 60 V 76 H 40 V 60 H 24 V 40 H 40 Z" fill="#FFFFFF"/></svg>`,
  maapilim: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#1E3A8A"/><path d="M 18,58 L 26,72 H 74 L 82,58 Z" fill="#FFFFFF"/><rect x="36" y="46" width="28" height="12" fill="#FFFFFF"/><rect x="42" y="38" width="16" height="8" fill="#FFFFFF"/><line x1="50" y1="20" x2="50" y2="38" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/><circle cx="34" cy="64" r="2.5" fill="#1E3A8A"/><circle cx="50" cy="64" r="2.5" fill="#1E3A8A"/><circle cx="66" cy="64" r="2.5" fill="#1E3A8A"/><path d="M 12,78 C 20,74 28,82 36,78 C 44,74 52,82 60,78 C 68,74 76,82 84,78" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/></svg>`,
  other: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="22" fill="#6A9B7E"/><path d="M50,24 C38,24 30,32 30,44 C30,58 50,78 50,78 C50,78 70,58 70,44 C70,32 62,24 50,24 Z" fill="#FFFFFF"/><circle cx="50" cy="44" r="8" fill="#6A9B7E"/></svg>`,
};

export async function fetchPois(): Promise<PoiRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('poi')
    .select('id, name, description, lat, lng, type')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as PoiRow[];
}
