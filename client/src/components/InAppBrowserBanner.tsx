import { useState } from 'react';
import { detectInAppBrowser, inAppBrowserOpenHint } from '../lib/inAppBrowser';

type Props = {
  className?: string;
};

export function InAppBrowserBanner({ className }: Props) {
  const [kind] = useState(() => detectInAppBrowser());
  const [dismissed, setDismissed] = useState(false);

  if (!kind || dismissed) return null;

  return (
    <div
      className={className ? `inapp-browser-banner ${className}` : 'inapp-browser-banner'}
      role="status"
    >
      <p>{inAppBrowserOpenHint(kind)}</p>
      <p className="inapp-browser-banner-sub">
        מיקום עובד בצורה אמינה יותר בספארי או בכרום — לא בתוך האפליקציה.
      </p>
      <button type="button" className="inapp-browser-banner-dismiss" onClick={() => setDismissed(true)}>
        הבנתי
      </button>
    </div>
  );
}
