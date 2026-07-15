import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DistressButton } from '../components/DistressButton';
import { MapView } from '../components/MapView';
import {
  buildMarkers,
  fetchActiveMapUsers,
  fetchAdminExtraUsers,
  fetchLiveLocations,
  type LiveLoc,
  type MapUserProfile,
} from '../lib/mapData';
import { startLocationTracker, type TrackerStatus } from '../lib/locationTracker';
import { fetchPois, type PoiRow } from '../lib/poi';
import { loadMapSnapshot, saveMapSnapshot, useOnlineStatus } from '../lib/offline';
import { getSupabase } from '../lib/supabase';
import type { PublicUser } from '../lib/api';

type Props = {
  user: PublicUser;
};

export function MapPage({ user }: Props) {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [profiles, setProfiles] = useState<MapUserProfile[]>([]);
  const [locations, setLocations] = useState<LiveLoc[]>([]);
  const [pois, setPois] = useState<PoiRow[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [trackerStatus, setTrackerStatus] = useState<TrackerStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user.role === 'admin';

  const refreshPresence = async () => {
    if (!navigator.onLine) {
      const cached = loadMapSnapshot();
      if (cached?.myLocation) setMyLocation(cached.myLocation);
      return;
    }

    try {
      const [active, locs, poiRows] = await Promise.all([
        fetchActiveMapUsers(),
        fetchLiveLocations(),
        fetchPois().catch(() => [] as PoiRow[]),
      ]);
      let nextProfiles = active;
      if (isAdmin) {
        const extra = await fetchAdminExtraUsers();
        const byId = new Map(extra.map((p) => [p.id, p]));
        for (const p of active) byId.set(p.id, p);
        byId.set(user.id, {
          id: user.id,
          name: user.name,
          role: user.role,
          traveler_type: user.traveler_type,
          status: user.status,
          color: user.color,
          last_location_at: byId.get(user.id)?.last_location_at ?? null,
        });
        nextProfiles = [...byId.values()];
      } else {
        const selfInList = active.some((p) => p.id === user.id);
        if (!selfInList) {
          nextProfiles = [
            ...active,
            {
              id: user.id,
              name: user.name,
              role: user.role,
              traveler_type: user.traveler_type,
              status: user.status,
              color: user.color,
              last_location_at: null,
            },
          ];
        }
      }
      setProfiles(nextProfiles);
      setLocations(locs);
      setPois(poiRows);

      const selfLoc = locs.find((l) => l.user_id === user.id);
      if (selfLoc) {
        setMyLocation((prev) => prev ?? { lat: selfLoc.lat, lng: selfLoc.lng });
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת המפה');
      const cached = loadMapSnapshot();
      if (cached?.myLocation) setMyLocation((prev) => prev ?? cached.myLocation);
    }
  };

  useEffect(() => {
    void refreshPresence();
    const interval = window.setInterval(() => void refreshPresence(), 30000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.status, user.color, user.name, isAdmin]);

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel('live-locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_locations' },
        () => {
          void refreshPresence();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, isAdmin]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (result) => {
          setMyLocation({
            lat: result.coords.latitude,
            lng: result.coords.longitude,
          });
        },
        () => undefined,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );
    }

    const stop = startLocationTracker({
      userId: user.id,
      enabled: true,
      onPosition: (pos) => setMyLocation({ lat: pos.lat, lng: pos.lng }),
      onStatus: (status, detail) => {
        setTrackerStatus(status);
        if (status === 'error' && detail) setError(detail);
        if (status === 'denied') setError('הרשאת מיקום נדחתה — אפשר לאפשר בהגדרות ולרענן.');
      },
    });
    return stop;
  }, [user.id]);

  const markers = useMemo(
    () =>
      buildMarkers({
        profiles,
        locations,
        selfId: user.id,
        isAdmin,
      }),
    [profiles, locations, user.id, isAdmin],
  );

  const markersWithSelfGps = useMemo(() => {
    let next = markers;
    if (myLocation) {
      const withoutSelf = markers.filter((m) => m.userId !== user.id);
      next = [
        ...withoutSelf,
        {
          userId: user.id,
          name: user.name,
          color: user.status === 'quiet' ? '#7f8c8d' : user.color,
          travelerType: user.traveler_type,
          status: user.status,
          lat: myLocation.lat,
          lng: myLocation.lng,
          isSelf: true,
          isQuiet: user.status === 'quiet',
          isStale: false,
          ageLabel: null,
        },
      ];
    }

    if (!navigator.onLine && next.length === 0) {
      const cached = loadMapSnapshot();
      if (cached) {
        return cached.markers.map((m) => ({
          userId: m.userId,
          name: m.name,
          color: m.color,
          travelerType: null as PublicUser['traveler_type'],
          status: 'active' as const,
          lat: m.lat,
          lng: m.lng,
          isSelf: m.userId === user.id,
          isQuiet: false,
          isStale: true,
          ageLabel: 'מטמון',
        }));
      }
    }

    return next;
  }, [markers, myLocation, user]);

  useEffect(() => {
    if (!navigator.onLine) return;
    saveMapSnapshot({
      myLocation,
      markers: markersWithSelfGps.map((m) => ({
        userId: m.userId,
        name: m.name,
        color: m.color,
        lat: m.lat,
        lng: m.lng,
      })),
    });
  }, [markersWithSelfGps, myLocation]);

  return (
    <section className={`map-page${online ? '' : ' is-offline'}`}>
      <MapView
        markers={markersWithSelfGps}
        pois={pois}
        myLocation={myLocation}
        onMessageUser={(peerId) => navigate(`/messages/${peerId}`)}
      />
      <div className="map-hud">
        {trackerStatus === 'watching' && <span className="hud-pill">מיקום פעיל</span>}
        {trackerStatus === 'denied' && <span className="hud-pill danger">אין GPS</span>}
        {myLocation && <span className="hud-pill">האיקון שלי על המפה</span>}
        {user.status === 'quiet' && <span className="hud-pill quiet">מצב שקט</span>}
        {!online && <span className="hud-pill danger">אופליין</span>}
        {error && <span className="hud-pill danger">{error}</span>}
      </div>
      <DistressButton lat={myLocation?.lat ?? null} lng={myLocation?.lng ?? null} />
    </section>
  );
}
