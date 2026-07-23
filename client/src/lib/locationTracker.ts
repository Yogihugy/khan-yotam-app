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
 * Smart GPS watcher: upsert live_locations on move >10m or every HEARTBEAT_MS
 * (timer republishes last-known coords so stationary sessions stay fresh).
 * location_history: significant move or every 5 min from real GPS callbacks only —
 * timer heartbeats do not insert history rows.
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
  let lastKnownPos: LatLng | null = null;
  let lastKnownAccuracy: number | null = null;
  let stopped = false;
  let watchId: number | null = null;
  let inflight = false;

  function handleWatchError(err: GeolocationPositionError) {
    if (err.code === err.PERMISSION_DENIED) onStatus?.('denied');
    else onStatus?.('error', err.message);
  }

  async function publish(
    pos: LatLng,
    accuracy: number | null,
    forceHistory: boolean,
    /** Timer heartbeat: refresh live + user timestamps only — no history row. */
    skipHistory = false,
  ) {
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

      if (!skipHistory) {
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
    lastKnownPos = pos;
    lastKnownAccuracy = accuracy;
    onPosition?.({ ...pos, accuracy });

    const now = Date.now();
    const moved = !lastSent || distanceMeters(lastSent, pos) > MOVE_THRESHOLD_M;
    const heartbeatDue = !lastSentAt || now - lastSentAt >= HEARTBEAT_MS;
    if (moved || heartbeatDue) {
      void publish(pos, accuracy, moved && !!lastSent);
    }
  }

  function startWatch() {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(
      (result) => handlePosition(result.coords),
      handleWatchError,
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      },
    );
  }

  function refreshAfterWake() {
    if (stopped) return;

    // iOS may suspend geolocation while backgrounded, so restart the watch
    // and force a one-shot publish when the page becomes visible again.
    startWatch();
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const pos = {
          lat: result.coords.latitude,
          lng: result.coords.longitude,
        };
        const accuracy =
          typeof result.coords.accuracy === 'number' ? result.coords.accuracy : null;
        lastKnownPos = pos;
        lastKnownAccuracy = accuracy;
        onPosition?.({ ...pos, accuracy });
        void publish(pos, accuracy, true);
      },
      handleWatchError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      },
    );
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      refreshAfterWake();
    }
  }

  function tickHeartbeat() {
    if (stopped || !lastKnownPos) return;
    if (Date.now() - lastSentAt < HEARTBEAT_MS) return;
    void publish(lastKnownPos, lastKnownAccuracy, false, true);
  }

  onStatus?.('watching');
  startWatch();
  const heartbeatId = window.setInterval(tickHeartbeat, HEARTBEAT_MS);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    stopped = true;
    window.clearInterval(heartbeatId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
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
