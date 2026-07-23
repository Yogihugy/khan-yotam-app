import { useEffect, useState, type FormEvent } from 'react';
import { adminApi, type AdminUserRow } from '../../lib/adminApi';

export function AdminUsersTab() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'guest' | 'staff' | 'admin'>('guest');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { users: rows } = await adminApi.listUsers();
    setUsers(rows);
  };

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת משתמשים'),
    );
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInviteUrl(null);
    try {
      const result = await adminApi.addUser({ name, phone, role });
      setInviteUrl(result.inviteUrl);
      setName('');
      setPhone('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הוספה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    if (!window.confirm('להסיר משתמש זה?')) return;
    try {
      await adminApi.removeUser(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הסרה נכשלה');
    }
  }

  async function onBan(id: string) {
    if (
      !window.confirm(
        'לחסום את מספר הטלפון של משתמש זה?\n\nהמשתמש יוסר, והמספר ייחסם מהרשמה מחדש (שונה מהסרה רגילה). ניתן לבטל את החסימה מאוחר יותר מרשימת החסימות.',
      )
    ) {
      return;
    }
    try {
      await adminApi.banUser(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'חסימה נכשלה');
    }
  }

  async function onExtend(id: string) {
    try {
      await adminApi.extendUser(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הארכה נכשלה');
    }
  }

  return (
    <div className="admin-tab">
      <h2>ניהול משתמשים</h2>
      <form className="admin-form-grid" onSubmit={onAdd}>
        <label>
          שם
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          טלפון
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label>
          תפקיד
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option value="guest">אורח</option>
            <option value="staff">צוות</option>
            <option value="admin">מנהל</option>
          </select>
        </label>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'שולחים הזמנה…' : 'הוספה + הזמנה'}
        </button>
      </form>
      {inviteUrl && (
        <p className="muted">
          קישור הזמנה: <code>{inviteUrl}</code>
        </p>
      )}
      {error && <p className="error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>שם</th>
              <th>טלפון</th>
              <th>תפקיד</th>
              <th>סטטוס</th>
              <th>תוקף</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.phone}</td>
                <td>{u.role}</td>
                <td>{u.status}</td>
                <td>{u.expires_at ? new Date(u.expires_at).toLocaleDateString('he-IL') : 'ללא'}</td>
                <td className="admin-inline-actions">
                  <button type="button" className="secondary" onClick={() => void onExtend(u.id)}>
                    הארכה
                  </button>
                  <button type="button" className="secondary" onClick={() => void onRemove(u.id)}>
                    הסרה
                  </button>
                  <button type="button" className="secondary" onClick={() => void onBan(u.id)}>
                    חסימה
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
