import { getSupabase } from './supabase';
import {
  HEARTBEAT_MS,
  HISTORY_INTERVAL_MS,
  MOVE_THRESHOLD_M,
  distanceMeters,
  type LatLng,
} from './geo';

export type TrackerStatus = 'idle' | 'watching' | 'denied' | 'unavailable' | 'error';

type TrackerOptions = {
  userId: string;
  enabled: boolean;
  onPosition?: (pos: LatLng & { accuracy: number | null }) => void;
  onStatus?: (status: TrackerStatus, detail?: string) => void;
};

/**
 * Smart GPS watcher: upsert live_locations when moved >10m or every 2 min;
 * insert location_history every 5 min or on significant move.
 */
export function startLocationTracker(opts: TrackerOptions): () => void {
  const { userId, enabled, onPosition, onStatus } = opts;

  if (!enabled || !navigator.geolocation) {
    onStatus?.(navigator.geolocation ? 'idle' : 'unavailable');
    return () => undefined;
  }

  let lastSent: LatLng | null = null;
  let lastSentAt = 0;
  let lastHistory: LatLng | null = null;
  let lastHistoryAt = 0;
  let stopped = false;
  let watchId: number | null = null;
  let inflight = false;

  async function publish(pos: LatLng, accuracy: number | null, forceHistory: boolean) {
    if (stopped || inflight) return;
    inflight = true;
    const supabase = getSupabase();
    const now = Date.now();

    try {
      const { error: liveError } = await supabase.from('live_locations').upsert(
        {
          user_id: userId,
          lat: pos.lat,
          lng: pos.lng,
          accuracy,
          updated_at: new Date(now).toISOString(),
        },
        { onConflict: 'user_id' },
      );
      if (liveError) throw liveError;

      const { error: userError } = await supabase
        .from('users')
        .update({
          last_location_at: new Date(now).toISOString(),
          last_seen_at: new Date(now).toISOString(),
        })
        .eq('id', userId);
      if (userError) throw userError;

      const movedFar =
        !lastHistory || distanceMeters(lastHistory, pos) >= MOVE_THRESHOLD_M;
      const historyDue = !lastHistoryAt || now - lastHistoryAt >= HISTORY_INTERVAL_MS;
      if (forceHistory || movedFar || historyDue) {
        const { error: histError } = await supabase.from('location_history').insert({
          user_id: userId,
          lat: pos.lat,
          lng: pos.lng,
          accuracy,
          recorded_at: new Date(now).toISOString(),
        });
        if (histError) throw histError;
        lastHistory = pos;
        lastHistoryAt = now;
      }

      lastSent = pos;
      lastSentAt = now;
      onStatus?.('watching');
    } catch (err) {
      onStatus?.('error', err instanceof Error ? err.message : 'location sync failed');
    } finally {
      inflight = false;
    }
  }

  function handlePosition(coords: GeolocationCoordinates) {
    const pos = { lat: coords.latitude, lng: coords.longitude };
    const accuracy = typeof coords.accuracy === 'number' ? coords.accuracy : null;
    onPosition?.({ ...pos, accuracy });

    const now = Date.now();
    const moved = !lastSent || distanceMeters(lastSent, pos) > MOVE_THRESHOLD_M;
    const heartbeatDue = !lastSentAt || now - lastSentAt >= HEARTBEAT_MS;
    if (moved || heartbeatDue) {
      void publish(pos, accuracy, moved && !!lastSent);
    }
  }

  onStatus?.('watching');
  watchId = navigator.geolocation.watchPosition(
    (result) => handlePosition(result.coords),
    (err) => {
      if (err.code === err.PERMISSION_DENIED) onStatus?.('denied');
      else onStatus?.('error', err.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000,
    },
  );

  return () => {
    stopped = true;
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
  };
}

export function requestLocationPermission(): Promise<PermissionState | 'prompt' | 'unsupported'> {
  if (!navigator.geolocation) return Promise.resolve('unsupported');
  if (!navigator.permissions?.query) return Promise.resolve('prompt');
  return navigator.permissions
    .query({ name: 'geolocation' })
    .then((r) => r.state)
    .catch(() => 'prompt' as const);
}
