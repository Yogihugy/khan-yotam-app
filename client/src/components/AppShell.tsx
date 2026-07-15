import { NavLink, Outlet } from 'react-router-dom';
import { EmergencyBanner } from './EmergencyBanner';
import { OfflineBanner } from './OfflineBanner';

type Props = {
  onOpenStatus: () => void;
  statusLabel: string;
  isAdmin?: boolean;
};

export function AppShell({ onOpenStatus, statusLabel, isAdmin }: Props) {
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
        <button type="button" className="nav-item" onClick={onOpenStatus}>
          {statusLabel}
        </button>
      </nav>
    </div>
  );
}
