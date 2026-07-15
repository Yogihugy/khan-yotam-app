import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { appConfig } from '../lib/config';
import { getSupabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * Phase A home placeholder — map/onboarding arrive in Phase B.
 */
export function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const supabase = getSupabase();
      void supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setReady(true);
      });

      const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next);
      });

      return () => sub.subscription.unsubscribe();
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Config error');
      setReady(true);
      return undefined;
    }
  }, []);

  if (!ready) {
    return (
      <main className="page">
        <div className="panel">
          <p>טוען…</p>
        </div>
      </main>
    );
  }

  if (configError) {
    return (
      <main className="page">
        <div className="panel">
          <h1>חאן יותם</h1>
          <p className="error">{configError}</p>
          <p className="muted">הגדירו את משתני VITE_SUPABASE_* ב־client/.env</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="panel">
        <p className="brand">{appConfig.appName}</p>
        <h1>שביל הים</h1>
        {session ? (
          <>
            <p>מחוברים בהצלחה. מפת הלייב תגיע בשלב B.</p>
            <button
              type="button"
              className="secondary"
              onClick={() => void getSupabase().auth.signOut()}
            >
              התנתקות
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              הכניסה היא בהזמנה בלבד. פתחו את הקישור שקיבלתם בוואטסאפ.
            </p>
            <p className="muted">
              לבדיקה מקומית: <code>/invite/&lt;token&gt;</code>
            </p>
            <Link className="ghost-link" to="/complete-profile">
              מסך השלמת פרופיל
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
