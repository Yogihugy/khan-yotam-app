export const MOVE_THRESHOLD_M = 10;
export const HEARTBEAT_MS = 2 * 60 * 1000;
export const HISTORY_INTERVAL_MS = 5 * 60 * 1000;
export const FRESH_MS = 10 * 60 * 1000;
export const STALE_HIDE_MS = 30 * 60 * 1000;

export type LatLng = { lat: number; lng: number };

/** Haversine distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type FreshnessKind = 'fresh' | 'aging' | 'stale';

export function freshnessOf(lastLocationAt: string | null | undefined, now = Date.now()): {
  kind: FreshnessKind;
  ageMinutes: number;
} | null {
  if (!lastLocationAt) return null;
  const age = now - new Date(lastLocationAt).getTime();
  if (Number.isNaN(age) || age < 0) return null;
  const ageMinutes = Math.floor(age / 60000);
  if (age < FRESH_MS) return { kind: 'fresh', ageMinutes };
  if (age < STALE_HIDE_MS) return { kind: 'aging', ageMinutes };
  return { kind: 'stale', ageMinutes };
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
