import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { EmergencyBanner } from '../components/EmergencyBanner';
import { InAppBrowserBanner } from '../components/InAppBrowserBanner';
import { LocationDeniedHelp } from '../components/LocationDeniedHelp';
import { acceptConsent } from '../lib/api';
import { appConfig } from '../lib/config';
import { getAccessToken } from '../lib/supabase';
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
  readCachedUser,
} from '../lib/userStore';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(() => {
    // DEV-only visual test: ?forceLocationDenied=1 (does not touch geolocation APIs)
    return (
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).has('forceLocationDenied')
    );
  });
  const [busy, setBusy] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  if (hasCompletedOnboarding()) {
    const user = readCachedUser();
    return <Navigate to={user?.traveler_type ? '/' : '/complete-profile'} replace />;
  }

  async function continueToApp() {
    setBusy(true);
    setError(null);
    setDenied(false);

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError('אין סשן פעיל — נסו לפתוח את הקישור מחדש.');
      setBusy(false);
      return;
    }
    try {
      await acceptConsent(accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת ההסכמה');
      setBusy(false);
      return;
    }

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
        <InAppBrowserBanner />
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

        <p className="muted">
          המדריך המלא זמין בכל שלב דרך סימן ה־&quot;?&quot; שבמפה.
        </p>

        <label className="onboarding-consent">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
          />
          {' '}קראתי, הבנתי ואני מאשר/ת כי מלאו לי 18 שנים, ואני מסכים/ה לשיתוף
          המיקום ולתנאי{' '}
          <Link to="/policy" target="_blank" rel="noopener noreferrer">
            הפרטיות
          </Link>
          .
        </label>

        <EmergencyBanner />

        {denied && <LocationDeniedHelp />}

        {error && <p className="error">{error}</p>}

        <button
          type="button"
          className="primary"
          disabled={busy || !consentChecked}
          onClick={() => void continueToApp()}
        >
          {busy ? 'מבקשים מיקום…' : denied ? 'ניסיון חוזר' : 'הבנתי, בואו נצא לדרך'}
        </button>
      </div>
    </main>
  );
}
