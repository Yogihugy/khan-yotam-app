import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { verifyInvite, type PublicUser } from '../lib/api';
import { fetchOwnUser } from '../lib/mapData';
import { getSupabase, setSessionFromTokens } from '../lib/supabase';
import { hasCompletedOnboarding, writeCachedUser } from '../lib/userStore';

function isProfileComplete(user: PublicUser): boolean {
  return Boolean(user.traveler_type && user.name && user.color);
}

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function continueFromUser(user: PublicUser, profileComplete: boolean) {
      writeCachedUser(user);
      if (!hasCompletedOnboarding()) {
        navigate('/onboarding', { replace: true });
      } else if (profileComplete) {
        navigate('/', { replace: true });
      } else {
        navigate('/complete-profile', { replace: true });
      }
    }

    async function tryResumeExistingSession(): Promise<boolean> {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      if (!data.session) return false;

      const user = await fetchOwnUser();
      if (!user) return false;
      if (cancelled) return true;

      continueFromUser(user, isProfileComplete(user));
      return true;
    }

    async function run() {
      if (!token) {
        setError('קישור הזמנה לא תקין');
        return;
      }

      try {
        if (await tryResumeExistingSession()) return;

        const result = await verifyInvite(token);
        await setSessionFromTokens(result.session);
        if (cancelled) return;

        continueFromUser(result.user, result.profile_complete);
      } catch (err) {
        if (cancelled) return;

        try {
          if (await tryResumeExistingSession()) return;
        } catch {
          // Fall through to the verify error below.
        }

        setError(err instanceof Error ? err.message : 'שגיאה באימות ההזמנה');
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <main className="page">
      <div className="panel">
        <h1>חאן יותם</h1>
        {error ? (
          <>
            <p className="error">{error}</p>
            <p className="muted">בקשו קישור הזמנה חדש מצוות חאן יותם.</p>
          </>
        ) : (
          <p>מאמתים את ההזמנה…</p>
        )}
      </div>
    </main>
  );
}
