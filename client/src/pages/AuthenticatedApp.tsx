import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useAuthState } from '../hooks/useAuthState';
import { startDistressQueueWorker } from '../lib/distressSend';
import { writeCachedUser, hasCompletedOnboarding } from '../lib/userStore';
import { ChatThreadPage } from './ChatThreadPage';
import { ExpiredPage } from './ExpiredPage';
import { HelpPage } from './HelpPage';
import { MapPage } from './MapPage';
import { MessagesPage } from './MessagesPage';
import { ProfilePage } from './ProfilePage';
import { StatusPage } from './StatusPage';
import { AdminDashboardPage } from './admin/AdminDashboardPage';

function GuestLanding() {
  const [params] = useSearchParams();
  const justDisconnected = params.get('disconnected') === '1';

  if (justDisconnected) {
    return (
      <main className="page">
        <div className="panel">
          <h1>חאן יותם</h1>
          <p className="muted">
            התנתקת בהצלחה. כדי להתחבר שוב, פתחו את הקישור שקיבלתם, או הירשמו מחדש עם מספר
            הטלפון שלכם.
          </p>
          <Link to="/register" className="primary">
            הרשמה מחדש
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="panel">
        <h1>חאן יותם</h1>
        <p className="muted">הכניסה היא בהזמנה בלבד. פתחו את הקישור שקיבלתם בוואטסאפ.</p>
        {import.meta.env.DEV && (
          <p className="muted">
            לבדיקה מקומית: <code>/invite/&lt;token&gt;</code>
          </p>
        )}
      </div>
    </main>
  );
}

export function AuthenticatedApp() {
  const auth = useAuthState();

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

  if (auth.session && auth.user && !auth.user.traveler_type) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (!auth.user) {
    return (
      <main className="page">
        <div className="panel">
          <p>טוען…</p>
        </div>
      </main>
    );
  }

  const user = auth.user;

  const statusLabel =
    user.status === 'quiet' ? 'שקט' : user.status === 'offline' ? 'לא מחובר' : 'סטטוס';

  return (
    <Routes>
      <Route path="admin" element={<AdminDashboardPage user={user} />} />
      <Route
        element={<AppShell statusLabel={statusLabel} isAdmin={user.role === 'admin'} />}
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
        <Route
          path="status"
          element={
            <StatusPage
              user={user}
              onUserChange={(next) => {
                writeCachedUser(next);
                void auth.refreshUser();
              }}
              onDisconnect={() => auth.signOut()}
            />
          }
        />
        <Route path="help" element={<HelpPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
