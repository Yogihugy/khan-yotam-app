import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { verifyInvite } from '../lib/api';
import { setSessionFromTokens } from '../lib/supabase';

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setError('קישור הזמנה לא תקין');
        return;
      }

      try {
        const result = await verifyInvite(token);
        await setSessionFromTokens(result.session);
        sessionStorage.setItem('khan-yotam-user', JSON.stringify(result.user));

        if (cancelled) return;

        if (result.profile_complete) {
          navigate('/', { replace: true });
        } else {
          navigate('/complete-profile', { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'שגיאה באימות ההזמנה');
        }
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
