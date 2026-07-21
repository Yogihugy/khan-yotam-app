import { useEffect, useMemo, useState } from 'react';
import { MapView } from '../../components/MapView';
import { freshnessOf } from '../../lib/geo';
import { adminApi, type AdminUserRow } from '../../lib/adminApi';
import { fetchLiveLocations, type LiveLoc, type MapMarkerModel } from '../../lib/mapData';
import { fetchPois, type PoiRow } from '../../lib/poi';
import { POI_CHANGED_EVENT } from '../../lib/poiEvents';
import { getSupabase } from '../../lib/supabase';

export function AdminMapTab() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [locations, setLocations] = useState<LiveLoc[]>([]);
  const [pois, setPois] = useState<PoiRow[]>([]);
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [trail, setTrail] = useState<Array<{ lat: number; lng: number }>>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [{ users: rows }, locs, poiRows] = await Promise.all([
        adminApi.listUsers(),
        fetchLiveLocations(),
        fetchPois().catch(() => [] as PoiRow[]),
      ]);
      setUsers(rows);
      setLocations(locs);
      setPois(poiRows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת המפה');
    }
  };

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => void refresh(), 15000);
    const onPoiChanged = () => {
      void fetchPois()
        .then(setPois)
        .catch(() => {});
    };
    window.addEventListener(POI_CHANGED_EVENT, onPoiChanged);
    const supabase = getSupabase();
    const channel = supabase
      .channel('admin-live-locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      window.clearInterval(t);
      window.removeEventListener(POI_CHANGED_EVENT, onPoiChanged);
      void supabase.removeChannel(channel);
    };
  }, []);

  const markers: MapMarkerModel[] = useMemo(() => {
    const locBy = new Map(locations.map((l) => [l.user_id, l]));
    const out: MapMarkerModel[] = [];
    for (const u of users) {
      const loc = locBy.get(u.id);
      if (!loc) continue;
      const fresh = freshnessOf(u.last_location_at || loc.updated_at);
      const isQuiet = u.status === 'quiet';
      out.push({
        userId: u.id,
        name: u.name,
        color: isQuiet ? '#7f8c8d' : u.color,
        travelerType: u.traveler_type as MapMarkerModel['travelerType'],
        status: u.status as MapMarkerModel['status'],
        lat: loc.lat,
        lng: loc.lng,
        isSelf: false,
        isQuiet,
        isStale: fresh?.kind === 'stale',
        ageLabel:
          fresh?.kind === 'aging'
            ? `נראה לפני ${fresh.ageMinutes} דק׳`
            : fresh?.kind === 'stale'
              ? 'ישן'
              : null,
      });
    }
    return out;
  }, [users, locations]);

  async function showTrail(user: AdminUserRow) {
    setSelected(user);
    try {
      const { points } = await adminApi.userTrail(user.id, 24);
      setTrail(points.map((p) => ({ lat: p.lat, lng: p.lng })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת מסלול');
      setTrail([]);
    }
  }

  return (
    <div className="admin-tab admin-map-tab">
      <div className="admin-map-stage">
        <MapView markers={markers} pois={pois} myLocation={null} trail={trail} />
      </div>
      <aside className="admin-side-panel">
        <h2>משתמשים על המפה</h2>
        <p className="muted">שקט = אפור. ישן = דהוי. לחצו להצגת פרטים + מסלול 24ש׳.</p>
        {error && <p className="error">{error}</p>}
        <ul className="admin-user-list">
          {users.map((u) => {
            const hasLoc = locations.some((l) => l.user_id === u.id);
            return (
              <li key={u.id}>
                <button
                  type="button"
                  className={selected?.id === u.id ? 'admin-user-row active' : 'admin-user-row'}
                  onClick={() => void showTrail(u)}
                >
                  <span className="convo-dot" style={{ background: u.color }} />
                  <span>
                    <strong>{u.name}</strong>
                    <span className="muted">
                      {u.status}
                      {!hasLoc ? ' · אין מיקום' : ''}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {selected && (
          <div className="admin-detail">
            <h3>{selected.name}</h3>
            <p>
              טלפון: <a href={`tel:${selected.phone}`}>{selected.phone}</a>
            </p>
            <p>סוג: {selected.traveler_type || '—'}</p>
            <p>מיקום אחרון: {selected.last_location_at || '—'}</p>
            <p>נראה לאחרונה: {selected.last_seen_at || '—'}</p>
            <button type="button" className="secondary" onClick={() => setTrail([])}>
              נקה מסלול
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
