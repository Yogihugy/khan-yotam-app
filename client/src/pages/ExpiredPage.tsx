import { EmergencyBanner } from '../components/EmergencyBanner';
import { appConfig } from '../lib/config';

export function ExpiredPage() {
  return (
    <main className="page">
      <div className="panel">
        <p className="brand">{appConfig.appName}</p>
        <h1>הגישה פגה</h1>
        <p>פג תוקף הגישה שלכם לשביל. פנו לחאן יותם לחידוש.</p>
        <EmergencyBanner />
      </div>
    </main>
  );
}
