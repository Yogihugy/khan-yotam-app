import { getSupabase } from './supabase';
import { freshnessOf } from './geo';
import type { PublicUser } from './api';

export type MapUserProfile = {
  id: string;
  name: string;
  role: PublicUser['role'];
  traveler_type: PublicUser['traveler_type'];
  status: PublicUser['status'];
  color: string;
  last_location_at: string | null;
};

export type LiveLoc = {
  user_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  updated_at: string | null;
};

export type MapMarkerModel = {
  userId: string;
  name: string;
  color: string;
  travelerType: PublicUser['traveler_type'];
  status: PublicUser['status'];
  lat: number;
  lng: number;
  isSelf: boolean;
  isQuiet: boolean;
  isStale: boolean;
  ageLabel: string | null;
};

export async function fetchOwnUser(): Promise<PublicUser | null> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, role, traveler_type, color, status, expires_at')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) throw error;
  return data as PublicUser | null;
}

export async function fetchEmergencyPhone(): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'emergency_phone')
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

export async function fetchActiveMapUsers(): Promise<MapUserProfile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_active_map_users');
  if (error) throw error;
  return (data || []) as MapUserProfile[];
}

export async function fetchAdminExtraUsers(): Promise<MapUserProfile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role, traveler_type, status, color, last_location_at')
    .eq('is_deleted', false)
    .in('status', ['quiet', 'active']);
  if (error) throw error;
  return (data || []) as MapUserProfile[];
}

export async function fetchLiveLocations(): Promise<LiveLoc[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('live_locations')
    .select('user_id, lat, lng, accuracy, updated_at');
  if (error) throw error;
  return (data || []) as LiveLoc[];
}

export async function updateOwnStatus(status: 'active' | 'quiet' | 'offline') {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('users')
    .update({ status, last_seen_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, phone, role, traveler_type, color, status, expires_at')
    .single();

  if (error) throw error;
  return data as PublicUser;
}

export async function updateOwnProfile(payload: {
  name: string;
  traveler_type: string;
  color: string;
}) {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('users')
    .update({
      name: payload.name.trim(),
      traveler_type: payload.traveler_type,
      color: payload.color,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, name, phone, role, traveler_type, color, status, expires_at')
    .single();

  if (error) throw error;
  return data as PublicUser;
}

export function buildMarkers(args: {
  profiles: MapUserProfile[];
  locations: LiveLoc[];
  selfId: string;
  isAdmin: boolean;
  now?: number;
}): MapMarkerModel[] {
  const now = args.now ?? Date.now();
  const locByUser = new Map(args.locations.map((l) => [l.user_id, l]));
  const markers: MapMarkerModel[] = [];

  for (const profile of args.profiles) {
    const loc = locByUser.get(profile.id);
    if (!loc) continue;

    const isSelf = profile.id === args.selfId;
    const isQuiet = profile.status === 'quiet';
    const fresh = freshnessOf(profile.last_location_at || loc.updated_at, now);

    if (isQuiet && !isSelf && !args.isAdmin) continue;
    if (!isSelf && !args.isAdmin && fresh?.kind === 'stale') continue;
    if (!isSelf && !args.isAdmin && !fresh) continue;

    markers.push({
      userId: profile.id,
      name: profile.name,
      color: isQuiet ? '#7f8c8d' : profile.color,
      travelerType: profile.traveler_type,
      status: profile.status,
      lat: loc.lat,
      lng: loc.lng,
      isSelf,
      isQuiet,
      isStale: fresh?.kind === 'stale',
      ageLabel: fresh?.kind === 'aging' ? `נראה לפני ${fresh.ageMinutes} דק׳` : null,
    });
  }

  return markers;
}

export function travelerLabel(type: PublicUser['traveler_type']): string {
  switch (type) {
    case 'hiker':
      return 'מטייל/ת ברגל';
    case 'cyclist':
      return 'רוכב/ת אופניים';
    case 'staff':
      return 'צוות';
    case 'other':
      return 'אחר';
    default:
      return '—';
  }
}
