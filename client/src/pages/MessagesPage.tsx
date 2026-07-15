import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchActiveMapUsers,
  type MapUserProfile,
} from '../lib/mapData';
import { fetchConversationPreviews, type ConversationPreview } from '../lib/chat';
import type { PublicUser } from '../lib/api';

type Props = {
  user: PublicUser;
};

export function MessagesPage({ user }: Props) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [activeUsers, setActiveUsers] = useState<MapUserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const [convos, active] = await Promise.all([
        fetchConversationPreviews(user.id),
        fetchActiveMapUsers(),
      ]);
      setConversations(convos);
      setActiveUsers(active.filter((u) => u.id !== user.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת הודעות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => void refresh(), 20000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const peersInConvos = useMemo(
    () => new Set(conversations.map((c) => c.peerId)),
    [conversations],
  );

  const startable = activeUsers.filter((u) => !peersInConvos.has(u.id));

  return (
    <main className="shell-page messages-page">
      <div className="panel messages-panel">
        <h1>הודעות</h1>
        <p className="muted">שיחה אחד־על־אחד עם משתמשים פעילים על המפה.</p>

        {loading && <p className="muted">טוען…</p>}
        {error && <p className="error">{error}</p>}

        <section className="convo-section">
          <h2>שיחות</h2>
          {conversations.length === 0 ? (
            <p className="muted">אין שיחות עדיין.</p>
          ) : (
            <ul className="convo-list">
              {conversations.map((c) => (
                <li key={c.threadId}>
                  <Link to={`/messages/${c.peerId}`} className="convo-item">
                    <span className="convo-dot" style={{ background: c.peerColor }} />
                    <span className="convo-body">
                      <strong>{c.peerName}</strong>
                      <span className="muted">{c.lastMessage}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="convo-section">
          <h2>התחלה חדשה</h2>
          {startable.length === 0 ? (
            <p className="muted">אין משתמשים פעילים נוספים כרגע. אפשר גם מהמפה.</p>
          ) : (
            <ul className="convo-list">
              {startable.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="convo-item buttonish"
                    onClick={() => navigate(`/messages/${u.id}`)}
                  >
                    <span className="convo-dot" style={{ background: u.color }} />
                    <span className="convo-body">
                      <strong>{u.name}</strong>
                      <span className="muted">פתיחת שיחה</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
