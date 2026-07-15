import { useOnlineStatus } from '../lib/offline';

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="offline-banner" role="status">
      אין חיבור לרשת — מוצגת מפה שמורה במטמון. כפתור החירום יישמר ויישלח כשיחזור האות.
    </div>
  );
}
