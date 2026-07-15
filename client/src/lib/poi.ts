import { getSupabase } from './supabase';

export type PoiRow = {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  type: 'khan' | 'parking' | 'water' | 'warning' | 'other';
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

export function poiSymbol(type: PoiRow['type']): string {
  switch (type) {
    case 'khan':
      return '⌂';
    case 'parking':
      return 'P';
    case 'water':
      return 'W';
    case 'warning':
      return '!';
    default:
      return '•';
  }
}
