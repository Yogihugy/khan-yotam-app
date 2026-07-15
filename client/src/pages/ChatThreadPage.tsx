import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  fetchChatPeer,
  fetchMessages,
  markThreadRead,
  sendMessage,
  threadIdFor,
  type ChatMessage,
} from '../lib/chat';
import { getSupabase } from '../lib/supabase';
import type { PublicUser } from '../lib/api';

type Props = {
  user: PublicUser;
};

export function ChatThreadPage({ user }: Props) {
  const { peerId = '' } = useParams<{ peerId: string }>();
  const [peerName, setPeerName] = useState('שיחה');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const threadId = peerId ? threadIdFor(user.id, peerId) : '';

  useEffect(() => {
    if (!peerId) return;
    void fetchChatPeer(peerId).then((p) => {
      if (p) setPeerName(p.name);
    });
  }, [peerId]);

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;

    async function load() {
      try {
        const rows = await fetchMessages(threadId);
        if (!cancelled) {
          setMessages(rows);
          setError(null);
        }
        await markThreadRead(threadId, user.id);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'שגיאה בטעינת השיחה');
        }
      }
    }

    void load();

    const supabase = getSupabase();
    const channel = supabase
      .channel(`messages:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
          if (row.to_user_id === user.id) {
            void markThreadRead(threadId, user.id);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [threadId, user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !peerId) return;
    setSending(true);
    setError(null);
    try {
      const row = await sendMessage({
        fromUserId: user.id,
        toUserId: peerId,
        content,
      });
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שליחה נכשלה');
    } finally {
      setSending(false);
    }
  }

  if (!peerId) {
    return (
      <main className="shell-page">
        <div className="panel">
          <p className="error">חסר מזהה משתמש</p>
          <Link to="/messages">חזרה</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="shell-page chat-page">
      <div className="chat-shell panel">
        <header className="chat-header">
          <Link to="/messages" className="ghost-link">
            ← חזרה
          </Link>
          <h1>{peerName}</h1>
        </header>

        <div className="chat-messages">
          {messages.map((m) => {
            const mine = m.from_user_id === user.id;
            return (
              <div key={m.id} className={mine ? 'bubble mine' : 'bubble theirs'}>
                <p>{m.content}</p>
                <time>
                  {new Date(m.created_at).toLocaleTimeString('he-IL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && <p className="error">{error}</p>}

        <form className="chat-compose" onSubmit={onSubmit}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="כתבו הודעה…"
            maxLength={1000}
            autoComplete="off"
          />
          <button type="submit" className="primary" disabled={sending || !text.trim()}>
            שליחה
          </button>
        </form>
      </div>
    </main>
  );
}
