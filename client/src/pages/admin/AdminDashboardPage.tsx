import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PublicUser } from '../../lib/api';
import { AdminActivityLogTab } from './AdminActivityLogTab';
import { AdminDistressTab } from './AdminDistressTab';
import { AdminDutyOfficerTab } from './AdminDutyOfficerTab';
import { AdminMapTab } from './AdminMapTab';
import { AdminPoiTab } from './AdminPoiTab';
import { AdminProtocolTab } from './AdminProtocolTab';
import { AdminUsersTab } from './AdminUsersTab';

const TABS = [
  { id: 'map', label: 'מפה מלאה' },
  { id: 'distress', label: 'קריאות מצוקה' },
  { id: 'users', label: 'משתמשים' },
  { id: 'poi', label: 'נקודות עניין' },
  { id: 'protocol', label: 'פרוטוקול' },
  { id: 'duty', label: 'קצין תורן' },
  { id: 'activity', label: 'יומן' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type Props = {
  user: PublicUser;
};

export function AdminDashboardPage({ user }: Props) {
  const [tab, setTab] = useState<TabId>('map');

  if (user.role !== 'admin') {
    return (
      <main className="page">
        <div className="panel">
          <h1>אין הרשאה</h1>
          <p className="muted">לוח ChaML זמין למנהלים בלבד.</p>
          <Link to="/">חזרה למפה</Link>
        </div>
      </main>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <p className="brand">ChaML · חאן יותם</p>
          <h1>לוח ניהול</h1>
        </div>
        <Link className="secondary" to="/">
          חזרה לאפליקציה
        </Link>
      </header>

      <nav className="admin-tabs" aria-label="לשוניות ניהול">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'admin-tab-btn active' : 'admin-tab-btn'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="admin-body">
        {tab === 'map' && <AdminMapTab />}
        {tab === 'distress' && <AdminDistressTab />}
        {tab === 'users' && <AdminUsersTab />}
        {tab === 'poi' && <AdminPoiTab />}
        {tab === 'protocol' && <AdminProtocolTab />}
        {tab === 'duty' && <AdminDutyOfficerTab />}
        {tab === 'activity' && <AdminActivityLogTab />}
      </div>
    </div>
  );
}
