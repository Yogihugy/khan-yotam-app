import { useEffect, useState } from 'react';
import { adminApi, type ActivityEvent } from '../../lib/adminApi';

const EVENT_TYPES = ['', 'login', 'logout', 'distress', 'status_change', 'invite_sent'];

export function AdminActivityLogTab() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [eventType, setEventType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const { events: rows } = await adminApi.activityLog({
        event_type: eventType || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      setEvents(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת היומן');
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-tab">
      <h2>יומן פעילות</h2>
      <div className="admin-form-grid">
        <label>
          סוג אירוע
          <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {EVENT_TYPES.map((t) => (
              <option key={t || 'all'} value={t}>
                {t || 'הכל'}
              </option>
            ))}
          </select>
        </label>
        <label>
          מתאריך
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          עד תאריך
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" className="primary" onClick={() => void refresh()}>
          סינון
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>זמן</th>
              <th>משתמש</th>
              <th>אירוע</th>
              <th>פרטים</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td>{new Date(ev.created_at).toLocaleString('he-IL')}</td>
                <td>{ev.users?.name || ev.user_id || '—'}</td>
                <td>{ev.event_type}</td>
                <td>
                  <code className="admin-meta">
                    {ev.metadata ? JSON.stringify(ev.metadata) : '—'}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
