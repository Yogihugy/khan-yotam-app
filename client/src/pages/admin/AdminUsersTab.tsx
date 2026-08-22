import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { adminApi, type AdminUserRow } from '../../lib/adminApi';

type Lifecycle = 'active' | 'removed' | 'banned' | 'all';
type SortKey = 'name' | 'expires_at';
type SortDir = 'asc' | 'desc';

function isExpired(expiresAt: string | null): boolean {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
}

function compareUsers(a: AdminUserRow, b: AdminUserRow, key: SortKey, dir: SortDir): number {
  const mul = dir === 'asc' ? 1 : -1;
  if (key === 'name') {
    return mul * a.name.localeCompare(b.name, 'he');
  }
  const aTime = a.expires_at ? new Date(a.expires_at).getTime() : Number.POSITIVE_INFINITY;
  const bTime = b.expires_at ? new Date(b.expires_at).getTime() : Number.POSITIVE_INFINITY;
  if (aTime === bTime) return 0;
  return mul * (aTime < bTime ? -1 : 1);
}

export function AdminUsersTab() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [lifecycle, setLifecycle] = useState<Lifecycle>('active');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'guest' | 'staff' | 'admin'>('guest');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async (nextLifecycle: Lifecycle = lifecycle) => {
    const { users: rows } = await adminApi.listUsers(nextLifecycle);
    setUsers(rows);
  };

  useEffect(() => {
    setInviteUrl(null);
    void refresh(lifecycle).catch((err) =>
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת משתמשים'),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycle]);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => compareUsers(a, b, sortKey, sortDir)),
    [users, sortKey, sortDir],
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInviteUrl(null);
    try {
      const result = await adminApi.addUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone,
        role,
      });
      setInviteUrl(result.inviteUrl);
      setFirstName('');
      setLastName('');
      setPhone('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הוספה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string, name: string) {
    if (!window.confirm(`להסיר את ${name}?`)) return;
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
        'לחסום את מספר הטלפון של משתמש זה?\n\nהמשתמש יוסר, והמספר ייחסם מהרשמה מחדש (שונה מהסרה רגילה). ניתן לבטל את החסימה מאוחר יותר דרך סינון "חסומים" בטבלת המשתמשים.',
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

  async function onUnban(phoneNumber: string) {
    if (
      !window.confirm(
        'לבטל את החסימה למספר זה?\n\nהמספר יוכל להירשם מחדש. המשתמש הישן יישאר מוסר לצמיתות (לא יתחבר מחדש אוטומטית).',
      )
    ) {
      return;
    }
    try {
      await adminApi.unbanPhone(phoneNumber);
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ביטול חסימה נכשל');
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

  function rowActions(u: AdminUserRow) {
    if (u.is_banned) {
      return (
        <button type="button" className="secondary" onClick={() => void onUnban(u.phone)}>
          ביטול חסימה
        </button>
      );
    }
    if (u.is_deleted) {
      return (
        <button type="button" className="secondary" onClick={() => void onBan(u.id)}>
          חסימה
        </button>
      );
    }
    return (
      <>
        <button type="button" className="secondary" onClick={() => void onExtend(u.id)}>
          הארכה
        </button>
        <button type="button" className="secondary" onClick={() => void onRemove(u.id, u.name)}>
          הסרה
        </button>
        <button type="button" className="secondary" onClick={() => void onBan(u.id)}>
          חסימה
        </button>
      </>
    );
  }

  return (
    <div className="admin-tab">
      <h2>ניהול משתמשים</h2>
      <form className="admin-form-grid" onSubmit={onAdd}>
        <label>
          שם פרטי
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            maxLength={80}
            autoComplete="given-name"
          />
        </label>
        <label>
          שם משפחה
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={80}
            autoComplete="family-name"
          />
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
          {busy ? 'יוצרים קישור…' : 'יצירת קישור הזמנה'}
        </button>
      </form>
      {inviteUrl && (
        <p className="muted invite-url-row">
          קישור הזמנה: <code>{inviteUrl}</code>
          <button
            type="button"
            className="ghost-link"
            onClick={() => {
              void navigator.clipboard.writeText(inviteUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? 'הועתק ✓' : 'העתק'}
          </button>
        </p>
      )}

      <div className="admin-form-grid admin-filter-narrow">
        <label>
          סטטוס משתמש
          <select
            value={lifecycle}
            onChange={(e) => setLifecycle(e.target.value as Lifecycle)}
          >
            <option value="active">פעילים</option>
            <option value="removed">הוסרו</option>
            <option value="banned">חסומים</option>
            <option value="all">הכל</option>
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  className="admin-sort-btn"
                  onClick={() => toggleSort('name')}
                  aria-sort={
                    sortKey === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                >
                  שם{sortIndicator('name')}
                </button>
              </th>
              <th>טלפון</th>
              <th>תפקיד</th>
              <th>סטטוס</th>
              <th>
                <button
                  type="button"
                  className="admin-sort-btn"
                  onClick={() => toggleSort('expires_at')}
                  aria-sort={
                    sortKey === 'expires_at'
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  תוקף{sortIndicator('expires_at')}
                </button>
              </th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td dir="ltr">{u.phone}</td>
                <td>{u.role}</td>
                <td>{u.status}</td>
                <td className={isExpired(u.expires_at) ? 'admin-expired' : undefined}>
                  {u.expires_at ? new Date(u.expires_at).toLocaleDateString('he-IL') : 'ללא'}
                </td>
                <td className="admin-inline-actions">{rowActions(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
