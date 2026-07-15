import { useEffect, useState } from 'react';

const CACHE_KEY = 'khan-yotam-map-cache';

export type MapSnapshot = {
  markers: Array<{
    userId: string;
    name: string;
    color: string;
    lat: number;
    lng: number;
  }>;
  myLocation: { lat: number; lng: number } | null;
  savedAt: string;
};

export function saveMapSnapshot(snapshot: Omit<MapSnapshot, 'savedAt'>) {
  try {
    const payload: MapSnapshot = { ...snapshot, savedAt: new Date().toISOString() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function loadMapSnapshot(): MapSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as MapSnapshot) : null;
  } catch {
    return null;
  }
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return online;
}
