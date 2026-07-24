import { useEffect, useState } from 'react';
import { adminApi, type BannedPhoneRow } from '../../lib/adminApi';

export function AdminBannedPhonesTab() {
  const [bans, setBans] = useState<BannedPhoneRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const { bans: rows } = await adminApi.listBannedPhones();
    setBans(rows);
  };

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת החסימות'),
    );
  }, []);

  async function onUnban(phone: string) {
    if (
      !window.confirm(
        'לבטל את החסימה למספר זה?\n\nהמספר יוכל להירשם מחדש. המשתמש הישן יישאר מוסר לצמיתות (לא יתחבר מחדש אוטומטית).',
      )
    ) {
      return;
    }
    try {
      await adminApi.unbanPhone(phone);
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ביטול חסימה נכשל');
    }
  }

  return (
    <div className="admin-tab">
      <h2>מספרים חסומים</h2>
      {error && <p className="error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>טלפון</th>
              <th>תאריך חסימה</th>
              <th>נחסם ע״י</th>
              <th>סיבה</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {bans.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  אין מספרים חסומים
                </td>
              </tr>
            ) : (
              bans.map((b) => (
                <tr key={b.phone}>
                  <td dir="ltr">{b.phone}</td>
                  <td>
                    {b.banned_at ? new Date(b.banned_at).toLocaleString('he-IL') : '—'}
                  </td>
                  <td>{b.banned_by_user?.name || b.banned_by || '—'}</td>
                  <td>{b.reason || '—'}</td>
                  <td className="admin-inline-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void onUnban(b.phone)}
                    >
                      ביטול חסימה
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
