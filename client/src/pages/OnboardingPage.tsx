import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { EmergencyBanner } from '../components/EmergencyBanner';
import { LocationDeniedHelp } from '../components/LocationDeniedHelp';
import { appConfig } from '../lib/config';
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
  readCachedUser,
} from '../lib/userStore';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  if (hasCompletedOnboarding()) {
    const user = readCachedUser();
    return <Navigate to={user?.traveler_type ? '/' : '/complete-profile'} replace />;
  }

  async function continueToApp() {
    setBusy(true);
    setError(null);
    setDenied(false);

    if (!navigator.geolocation) {
      setError('המכשיר לא תומך ב‑GPS. לא ניתן להמשיך בלי מיקום.');
      setBusy(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        markOnboardingComplete();
        const user = readCachedUser();
        const needsProfile = !user?.traveler_type;
        navigate(needsProfile ? '/complete-profile' : '/', { replace: true });
        setBusy(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setDenied(true);
        } else {
          setError(err.message || 'לא הצלחנו לקבל מיקום');
        }
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  }

  return (
    <main className="page">
      <div className="panel onboarding-panel">
        <p className="brand">{appConfig.appName}</p>
        <h1>שביל הים — חי</h1>
        <p>רואים מי על השביל, משוחחים, וקוראים לעזרה כשצריך.</p>

        <ul className="onboarding-list">
          <li>
            <strong>מיקום</strong> — האפליקציה חייבת גישה ל‑GPS כדי להציג אתכם ואת האחרים על המפה.
          </li>
          <li>
            <strong>כפתור אדום</strong> — לחירום בלבד. הוא מתריע מיד לצוות חאן יותם (זמין בשלב הבא).
          </li>
        </ul>

        <EmergencyBanner />

        {denied && <LocationDeniedHelp busy={busy} onRetry={() => void continueToApp()} />}

        {error && <p className="error">{error}</p>}

        <button type="button" className="primary" disabled={busy} onClick={() => void continueToApp()}>
          {busy ? 'מבקשים מיקום…' : denied ? 'ניסיון חוזר' : 'הבנתי, בואו נצא לדרך'}
        </button>
      </div>
    </main>
  );
}
