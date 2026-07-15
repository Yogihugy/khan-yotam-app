import { useEffect, useState, type FormEvent } from 'react';
import { adminApi } from '../../lib/adminApi';

export function AdminDutyOfficerTab() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [backupName, setBackupName] = useState('');
  const [backupPhone, setBackupPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void adminApi
      .getDuty()
      .then((r) => {
        const d = r.duty_officer;
        if (!d) return;
        setName(d.name || '');
        setPhone(d.phone || '');
        setBackupName(d.backup_name || '');
        setBackupPhone(d.backup_phone || '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה'));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    try {
      await adminApi.putDuty({
        name,
        phone,
        backup_name: backupName || null,
        backup_phone: backupPhone || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה');
    }
  }

  return (
    <div className="admin-tab">
      <h2>קצין תורן</h2>
      <p className="admin-duty-highlight">
        קצין תורן נוכחי: <strong>{name || '—'}</strong> | <strong>{phone || '—'}</strong>
      </p>
      <form className="admin-form-grid" onSubmit={onSubmit}>
        <label>
          שם
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          טלפון
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label>
          גיבוי — שם
          <input value={backupName} onChange={(e) => setBackupName(e.target.value)} />
        </label>
        <label>
          גיבוי — טלפון
          <input value={backupPhone} onChange={(e) => setBackupPhone(e.target.value)} />
        </label>
        <button type="submit" className="primary">
          שמירה
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {saved && <p className="muted">נשמר.</p>}
    </div>
  );
}
