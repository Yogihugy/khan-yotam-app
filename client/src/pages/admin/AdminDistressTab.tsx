import { useEffect, useRef, useState } from 'react';
import { adminApi, type DistressCallRow } from '../../lib/adminApi';
import { getSupabase } from '../../lib/supabase';

function playAlertTone() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    window.setTimeout(() => {
      osc.stop();
      void ctx.close();
    }, 700);
  } catch {
    // ignore autoplay restrictions
  }
}

export function AdminDistressTab() {
  const [calls, setCalls] = useState<DistressCallRow[]>([]);
  const [flash, setFlash] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());

  const refresh = async () => {
    try {
      const { calls: rows } = await adminApi.listDistress(false);
      setCalls(rows);
      setError(null);
      for (const c of rows) knownIds.current.add(c.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת קריאות');
    }
  };

  useEffect(() => {
    void refresh();
    const supabase = getSupabase();
    const channel = supabase
      .channel('admin-distress')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'distress_calls' },
        (payload) => {
          const row = payload.new as DistressCallRow;
          if (!knownIds.current.has(row.id)) {
            knownIds.current.add(row.id);
            playAlertTone();
            setFlash(true);
            window.setTimeout(() => setFlash(false), 2500);
          }
          void refresh();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'distress_calls' },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function onClose(id: string) {
    try {
      await adminApi.closeDistress(id, notes[id] || '');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'סגירה נכשלה');
    }
  }

  return (
    <div className={`admin-tab${flash ? ' distress-flash' : ''}`}>
      <div className="admin-toolbar">
        <h2>קריאות מצוקה</h2>
        <button type="button" className="secondary" onClick={() => void refresh()}>
          רענון
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>זמן</th>
              <th>שם</th>
              <th>טלפון</th>
              <th>מיקום</th>
              <th>סטטוס</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => {
              const open = !c.closed_at;
              const u = c.users;
              const maps =
                c.lat != null && c.lng != null
                  ? `https://maps.google.com/?q=${c.lat},${c.lng}`
                  : null;
              return (
                <tr key={c.id} className={open ? 'row-open' : ''}>
                  <td>{new Date(c.triggered_at).toLocaleString('he-IL')}</td>
                  <td>{u?.name || c.user_id.slice(0, 8)}</td>
                  <td>
                    {u?.phone ? <a href={`tel:${u.phone}`}>{u.phone}</a> : '—'}
                  </td>
                  <td>
                    {maps ? (
                      <a href={maps} target="_blank" rel="noreferrer">
                        מפה
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {open ? (
                      <strong className="error">פתוח</strong>
                    ) : (
                      `נסגר ${c.closed_at ? new Date(c.closed_at).toLocaleString('he-IL') : ''}`
                    )}
                  </td>
                  <td>
                    {open ? (
                      <div className="admin-inline-actions">
                        {u?.phone && (
                          <a className="secondary" href={`tel:${u.phone}`}>
                            חיוג
                          </a>
                        )}
                        <input
                          placeholder="הערות לסגירה"
                          value={notes[c.id] || ''}
                          onChange={(e) =>
                            setNotes((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                        />
                        <button type="button" className="primary" onClick={() => void onClose(c.id)}>
                          סגירת אירוע
                        </button>
                      </div>
                    ) : (
                      <span className="muted">{c.notes || '—'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {calls.length === 0 && <p className="muted">אין קריאות עדיין.</p>}
      </div>
    </div>
  );
}
