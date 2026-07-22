import { useEffect, useState, type FormEvent } from 'react';
import { MapView } from '../../components/MapView';
import { adminApi, type PoiAdmin } from '../../lib/adminApi';
import { notifyPoiChanged } from '../../lib/poiEvents';
import type { PoiRow } from '../../lib/poi';

const TYPES: PoiAdmin['type'][] = ['khan', 'parking', 'water', 'warning', 'other'];

/** Display labels for POI types — DB values stay unchanged (e.g. 'khan'). */
const TYPE_LABELS: Record<PoiAdmin['type'], string> = {
  khan: 'chan',
  parking: 'parking',
  water: 'water',
  warning: 'warning',
  other: 'other',
};

const EMPTY_FORM = {
  name: '',
  description: '',
  lat: '',
  lng: '',
  type: 'other' as PoiAdmin['type'],
};

export function AdminPoiTab() {
  const [rows, setRows] = useState<PoiAdmin[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const refresh = async () => {
    const { poi } = await adminApi.listPoi();
    setRows(poi);
  };

  useEffect(() => {
    void refresh().catch((err) => setError(err instanceof Error ? err.message : 'שגיאה'));
  }, []);

  const pois: PoiRow[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    lat: p.lat,
    lng: p.lng,
    type: p.type,
  }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        lat: Number(form.lat),
        lng: Number(form.lng),
        type: form.type,
      };
      if (editingId) {
        await adminApi.updatePoi(editingId, payload);
      } else {
        await adminApi.createPoi(payload);
      }
      setEditingId(null);
      setForm(EMPTY_FORM);
      setPicking(false);
      await refresh();
      notifyPoiChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה');
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm('למחוק נקודה זו?')) return;
    await adminApi.deletePoi(id);
    await refresh();
    notifyPoiChanged();
  }

  return (
    <div className="admin-tab admin-poi-tab">
      <h2>נקודות עניין</h2>
      <form className="admin-form-grid" onSubmit={onSubmit}>
        <label>
          שם
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </label>
        <label>
          תיאור
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>
        <label>
          lat
          <input
            value={form.lat}
            onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
            required
          />
        </label>
        <label>
          lng
          <input
            value={form.lng}
            onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
            required
          />
        </label>
        <label>
          סוג
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PoiAdmin['type'] }))}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={picking ? 'primary' : 'secondary'}
          onClick={() => setPicking((p) => !p)}
        >
          {picking ? 'ביטול בחירה' : 'בחר מיקום במפה'}
        </button>
        <button type="submit" className="primary">
          {editingId ? 'עדכון' : 'הוספה'}
        </button>
      </form>
      {picking && <p className="admin-pick-hint">לחצו על המפה לבחירת מיקום</p>}
      {error && <p className="error">{error}</p>}

      <div className={`admin-poi-map-stage${picking ? ' is-picking' : ''}`}>
        <MapView
          markers={[]}
          pois={pois}
          myLocation={null}
          onMapClick={
            picking
              ? (ll) => {
                  setForm((f) => ({
                    ...f,
                    lat: String(ll.lat),
                    lng: String(ll.lng),
                  }));
                  setPicking(false);
                }
              : undefined
          }
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>שם</th>
              <th>סוג</th>
              <th>מיקום</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{TYPE_LABELS[p.type]}</td>
                <td>
                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                </td>
                <td className="admin-inline-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setEditingId(p.id);
                      setForm({
                        name: p.name,
                        description: p.description || '',
                        lat: String(p.lat),
                        lng: String(p.lng),
                        type: p.type,
                      });
                      setPicking(false);
                    }}
                  >
                    עריכה
                  </button>
                  <button type="button" className="secondary" onClick={() => void onDelete(p.id)}>
                    מחיקה
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
