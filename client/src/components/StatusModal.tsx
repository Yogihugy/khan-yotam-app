type Props = {
  open: boolean;
  current: 'active' | 'quiet' | 'offline';
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSelect: (status: 'active' | 'quiet') => void;
  onDisconnect: () => void;
};

export function StatusModal({
  open,
  current,
  busy,
  error,
  onClose,
  onSelect,
  onDisconnect,
}: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="status-title">סטטוס</h2>
        <p className="muted">בחרו איך תופיעו במפה למשתמשים אחרים.</p>

        <button
          type="button"
          className={current === 'active' ? 'status-option active' : 'status-option'}
          disabled={busy}
          onClick={() => onSelect('active')}
        >
          <strong>פעיל/ה</strong>
          <span>נראים לכולם על המפה</span>
        </button>

        <button
          type="button"
          className={current === 'quiet' ? 'status-option active' : 'status-option'}
          disabled={busy}
          onClick={() => onSelect('quiet')}
        >
          <strong>שקט</strong>
          <span>מוסתרים מאחרים; אפשר עדיין לראות את המפה</span>
        </button>

        <button type="button" className="status-option danger" disabled={busy} onClick={onDisconnect}>
          <strong>התנתקות</strong>
          <span>יציאה מהאפליקציה</span>
        </button>

        {error && <p className="error">{error}</p>}

        <button type="button" className="secondary" onClick={onClose} disabled={busy}>
          סגירה
        </button>
      </div>
    </div>
  );
}
