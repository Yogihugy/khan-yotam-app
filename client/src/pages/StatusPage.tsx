import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateOwnStatus } from '../lib/mapData';
import { writeCachedUser } from '../lib/userStore';
import type { PublicUser } from '../lib/api';

type Props = {
  user: PublicUser;
  onUserChange: (user: PublicUser) => void;
  onDisconnect: () => void | Promise<void>;
};

export function StatusPage({ user, onUserChange, onDisconnect }: Props) {
  const navigate = useNavigate();
  const current = user.status === 'quiet' ? 'quiet' : 'active';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSelect(status: 'active' | 'quiet') {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateOwnStatus(status);
      writeCachedUser(updated);
      onUserChange(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'לא הצלחנו לעדכן סטטוס');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('להתנתק מהאפליקציה?')) return;
    setBusy(true);
    try {
      await onDisconnect();
      navigate('/?disconnected=1', { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell-page">
      <div className="panel">
        <h1>סטטוס</h1>
        <p className="muted">בחרו איך תופיעו במפה למשתמשים אחרים.</p>

        <button
          type="button"
          className={current === 'active' ? 'status-option active' : 'status-option'}
          disabled={busy}
          onClick={() => void onSelect('active')}
        >
          <strong>פעיל/ה</strong>
          <span>נראים לכולם על המפה</span>
        </button>

        <button
          type="button"
          className={current === 'quiet' ? 'status-option active' : 'status-option'}
          disabled={busy}
          onClick={() => void onSelect('quiet')}
        >
          <strong>שקט</strong>
          <span>מוסתרים מאחרים; אפשר עדיין לראות את המפה</span>
        </button>

        <button
          type="button"
          className="status-option danger"
          disabled={busy}
          onClick={() => void handleDisconnect()}
        >
          <strong>התנתקות</strong>
          <span>יציאה מהאפליקציה</span>
        </button>

        {error && <p className="error">{error}</p>}
        {saved && <p className="status-updated">עודכן ✓</p>}
      </div>
    </main>
  );
}
