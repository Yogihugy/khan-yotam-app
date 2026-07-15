import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { StatusModal } from '../components/StatusModal';
import { useAuthState } from '../hooks/useAuthState';
import { startDistressQueueWorker } from '../lib/distressSend';
import { updateOwnStatus } from '../lib/mapData';
import { writeCachedUser, hasCompletedOnboarding } from '../lib/userStore';
import { ChatThreadPage } from './ChatThreadPage';
import { ExpiredPage } from './ExpiredPage';
import { MapPage } from './MapPage';
import { MessagesPage } from './MessagesPage';
import { ProfilePage } from './ProfilePage';
import { AdminDashboardPage } from './admin/AdminDashboardPage';

function GuestLanding() {
  return (
    <main className="page">
      <div className="panel">
        <h1>חאן יותם</h1>
        <p className="muted">הכניסה היא בהזמנה בלבד. פתחו את הקישור שקיבלתם בוואטסאפ.</p>
        <p className="muted">
          לבדיקה מקומית: <code>/invite/&lt;token&gt;</code>
        </p>
      </div>
    </main>
  );
}

export function AuthenticatedApp() {
  const auth = useAuthState();
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.session) return undefined;
    return startDistressQueueWorker();
  }, [auth.session]);

  if (!auth.ready) {
    return (
      <main className="page">
        <div className="panel">
          <p>טוען…</p>
        </div>
      </main>
    );
  }

  if (auth.configError) {
    return (
      <main className="page">
        <div className="panel">
          <h1>חאן יותם</h1>
          <p className="error">{auth.configError}</p>
          <p className="muted">הגדירו את משתני VITE_SUPABASE_* ב־client/.env</p>
        </div>
      </main>
    );
  }

  if (!auth.session) {
    return <GuestLanding />;
  }

  if (auth.expired) {
    return <ExpiredPage />;
  }

  if (!hasCompletedOnboarding()) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!auth.user?.traveler_type) {
    return <Navigate to="/complete-profile" replace />;
  }

  const user = auth.user;

  async function onSelectStatus(status: 'active' | 'quiet') {
    setStatusBusy(true);
    setStatusError(null);
    try {
      const updated = await updateOwnStatus(status);
      writeCachedUser(updated);
      await auth.refreshUser();
      setStatusOpen(false);
    } catch (err) {
      console.error(err);
      setStatusError(err instanceof Error ? err.message : 'לא הצלחנו לעדכן סטטוס');
    } finally {
      setStatusBusy(false);
    }
  }

  const statusLabel =
    user.status === 'quiet' ? 'שקט' : user.status === 'offline' ? 'לא מחובר' : 'סטטוס';

  return (
    <>
      <Routes>
        <Route path="admin" element={<AdminDashboardPage user={user} />} />
        <Route
          element={
            <AppShell
              onOpenStatus={() => setStatusOpen(true)}
              statusLabel={statusLabel}
              isAdmin={user.role === 'admin'}
            />
          }
        >
          <Route index element={<MapPage user={user} />} />
          <Route path="messages" element={<MessagesPage user={user} />} />
          <Route path="messages/:peerId" element={<ChatThreadPage user={user} />} />
          <Route
            path="profile"
            element={
              <ProfilePage
                user={user}
                onUserChange={(next) => {
                  writeCachedUser(next);
                  void auth.refreshUser();
                }}
              />
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <StatusModal
        open={statusOpen}
        current={user.status === 'quiet' ? 'quiet' : 'active'}
        busy={statusBusy}
        error={statusError}
        onClose={() => {
          setStatusOpen(false);
          setStatusError(null);
        }}
        onSelect={(s) => void onSelectStatus(s)}
        onDisconnect={() => void auth.signOut()}
      />
    </>
  );
}
