import { useEffect, useState } from 'react';
import { applyPwaUpdate, subscribePwaNeedRefresh } from '../lib/pwaUpdate';

export function PwaUpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => subscribePwaNeedRefresh(setNeedRefresh), []);

  if (!needRefresh || dismissed) return null;

  return (
    <div className="pwa-update-banner" role="status" aria-live="polite">
      <p className="pwa-update-banner-text">יש עדכון חדש — לחצו לרענון</p>
      <div className="pwa-update-banner-actions">
        <button
          type="button"
          className="pwa-update-banner-refresh"
          disabled={updating}
          onClick={() => {
            setUpdating(true);
            void applyPwaUpdate().catch(() => setUpdating(false));
          }}
        >
          {updating ? 'מרענן…' : 'רענון'}
        </button>
        <button
          type="button"
          className="pwa-update-banner-dismiss"
          disabled={updating}
          onClick={() => setDismissed(true)}
        >
          לא עכשיו
        </button>
      </div>
    </div>
  );
}
