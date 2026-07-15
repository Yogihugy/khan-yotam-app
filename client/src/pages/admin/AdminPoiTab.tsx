import { useEffect, useState, type FormEvent } from 'react';
import { adminApi, type PoiAdmin } from '../../lib/adminApi';

const TYPES: PoiAdmin['type'][] = ['khan', 'parking', 'water', 'warning', 'other'];

export function AdminPoiTab() {
  const [rows, setRows] = useState<PoiAdmin[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    lat: '32.6905',
    lng: '34.9433',
    type: 'other' as PoiAdmin['type'],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const { poi } = await adminApi.listPoi();
    setRows(poi);
  };

  useEffect(() => {
    void refresh().catch((err) => setError(err instanceof Error ? err.message : 'שגיאה'));
  }, []);

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
      setForm({ name: '', description: '', lat: '32.6905', lng: '34.9433', type: 'other' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה');
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm('למחוק נקודה זו?')) return;
    await adminApi.deletePoi(id);
    await refresh();
  }

  return (
    <div className="admin-tab">
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
                {t}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="primary">
          {editingId ? 'עדכון' : 'הוספה'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
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
                <td>{p.type}</td>
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
