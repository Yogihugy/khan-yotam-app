import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { getSupabase } from './supabase';
import { threadIdFor } from './chat';

type UnreadMessagesContextValue = {
  unreadThreadIds: ReadonlySet<string>;
  unreadCount: number;
  markThreadSeen: (threadId: string) => void;
  /** Merge unread thread ids from conversation previews (skips threads already marked seen). */
  mergeUnreadFromPreviews: (threadIds: string[]) => void;
};

const UnreadMessagesContext = createContext<UnreadMessagesContextValue | null>(null);

type MessageRow = {
  thread_id: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
  read_at: string | null;
};

/** Soft two-tone beep — Web Audio API, no static audio asset. */
function playMessageChime() {
  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.07, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.01);
    };

    beep(880, now, 0.1);
    beep(1174.7, now + 0.12, 0.12);

    window.setTimeout(() => {
      void ctx.close();
    }, 400);
  } catch {
    // Autoplay / AudioContext restrictions — ignore.
  }
}

async function fetchUnreadThreadIds(selfId: string): Promise<Set<string>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('messages')
    .select('thread_id, from_user_id, to_user_id, created_at, read_at')
    .or(`from_user_id.eq.${selfId},to_user_id.eq.${selfId}`)
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) throw error;

  const byThread = new Map<string, MessageRow>();
  for (const row of (data || []) as MessageRow[]) {
    if (!byThread.has(row.thread_id)) byThread.set(row.thread_id, row);
  }

  const unread = new Set<string>();
  for (const row of byThread.values()) {
    if (row.to_user_id === selfId && row.read_at == null) {
      unread.add(row.thread_id);
    }
  }
  return unread;
}

function activeThreadIdFromPath(pathname: string, selfId: string): string | null {
  const match = pathname.match(/^\/messages\/([^/]+)\/?$/);
  if (!match) return null;
  const peerId = decodeURIComponent(match[1]);
  if (!peerId || peerId === selfId) return null;
  return threadIdFor(selfId, peerId);
}

type ProviderProps = {
  selfId: string;
  children: ReactNode;
};

export function UnreadMessagesProvider({ selfId, children }: ProviderProps) {
  const location = useLocation();
  const [unreadThreadIds, setUnreadThreadIds] = useState<Set<string>>(() => new Set());
  const seenThisSessionRef = useRef(new Set<string>());

  const activeThreadId = useMemo(
    () => activeThreadIdFromPath(location.pathname, selfId),
    [location.pathname, selfId],
  );
  const activeThreadIdRef = useRef(activeThreadId);
  activeThreadIdRef.current = activeThreadId;

  const markThreadSeen = useCallback((threadId: string) => {
    seenThisSessionRef.current.add(threadId);
    setUnreadThreadIds((prev) => {
      if (!prev.has(threadId)) return prev;
      const next = new Set(prev);
      next.delete(threadId);
      return next;
    });
  }, []);

  const mergeUnreadFromPreviews = useCallback((threadIds: string[]) => {
    setUnreadThreadIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of threadIds) {
        if (seenThisSessionRef.current.has(id) || next.has(id)) continue;
        next.add(id);
        changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchUnreadThreadIds(selfId)
      .then((ids) => {
        if (cancelled) return;
        for (const id of seenThisSessionRef.current) ids.delete(id);
        if (activeThreadIdRef.current) ids.delete(activeThreadIdRef.current);
        setUnreadThreadIds(ids);
      })
      .catch(() => {
        /* keep empty until realtime */
      });
    return () => {
      cancelled = true;
    };
  }, [selfId]);

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel(`unread-messages:${selfId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `to_user_id=eq.${selfId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          if (!row?.thread_id) return;

          const viewingThisThread = row.thread_id === activeThreadIdRef.current;
          if (viewingThisThread) return;

          seenThisSessionRef.current.delete(row.thread_id);
          setUnreadThreadIds((prev) => {
            if (prev.has(row.thread_id)) return prev;
            const next = new Set(prev);
            next.add(row.thread_id);
            return next;
          });
          playMessageChime();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selfId]);

  const value = useMemo<UnreadMessagesContextValue>(
    () => ({
      unreadThreadIds,
      unreadCount: unreadThreadIds.size,
      markThreadSeen,
      mergeUnreadFromPreviews,
    }),
    [unreadThreadIds, markThreadSeen, mergeUnreadFromPreviews],
  );

  return (
    <UnreadMessagesContext.Provider value={value}>{children}</UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages(): UnreadMessagesContextValue {
  const ctx = useContext(UnreadMessagesContext);
  if (!ctx) {
    throw new Error('useUnreadMessages must be used within UnreadMessagesProvider');
  }
  return ctx;
}
