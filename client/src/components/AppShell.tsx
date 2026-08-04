import { NavLink, Outlet } from 'react-router-dom';
import { EmergencyBanner } from './EmergencyBanner';
import { OfflineBanner } from './OfflineBanner';
import { useUnreadMessages } from '../lib/unreadMessages';

type Props = {
  isAdmin?: boolean;
};

export function AppShell({ isAdmin }: Props) {
  const { unreadCount } = useUnreadMessages();

  return (
    <div className="app-shell">
      <OfflineBanner />
      <EmergencyBanner />
      <div className="app-shell-main">
        <Outlet />
      </div>
      <nav className="bottom-nav" aria-label="ניווט ראשי">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          מפה
        </NavLink>
        <NavLink
          to="/messages"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          הודעות
          {unreadCount > 0 && (
            <span className="nav-unread-dot" aria-label={`${unreadCount} הודעות שלא נקראו`} />
          )}
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          פרופיל
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            ניהול
          </NavLink>
        )}
        <NavLink
          to="/status"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          סטטוס
        </NavLink>
      </nav>
    </div>
  );
}
