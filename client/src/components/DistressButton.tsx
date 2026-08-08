import { useEffect, useState } from 'react';
import { fetchEmergencyPhone } from '../lib/mapData';
import { listDistressQueue } from '../lib/distressQueue';
import { flushDistressQueue, sendOrQueueDistress } from '../lib/distressSend';

type State = 'idle' | 'sending' | 'sent' | 'waiting' | 'failed';

const LOCK_MS = 30_000;

function DistressHandIcon() {
  return (
    <svg
      className="distress-btn-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 12V4.5a1.5 1.5 0 0 1 3 0V10" />
      <path d="M11 10.5V3a1.5 1.5 0 0 1 3 0v7.5" />
      <path d="M14 10.5V4.5a1.5 1.5 0 0 1 3 0V13" />
      <path d="M17 11.5V8a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1.5c-1 0-2-.5-2.7-1.3L5 15c-.5-.6-.4-1.5.2-2 .5-.4 1.3-.4 1.8.1L8 14" />
    </svg>
  );
}

export function DistressButton({
  lat,
  lng,
}: {
  lat: number | null;
  lng: number | null;
}) {
  const [state, setState] = useState<State>('idle');
  const [phone, setPhone] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void fetchEmergencyPhone()
      .then((value) => {
        if (!cancelled) setPhone(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const refreshQueue = () => {
      void listDistressQueue()
        .then((items) => {
          setQueueCount(items.length);
          if (items.length > 0 && state !== 'sent') setState('waiting');
        })
        .catch(() => undefined);
    };
    refreshQueue();
    const onOnline = () => {
      void flushDistressQueue().then((result) => {
        setQueueCount(result.remaining < 0 ? queueCount : result.remaining);
        if (result.sent > 0 && result.remaining === 0) {
          setLockedUntil(Date.now() + LOCK_MS);
          setState('sent');
        } else if (result.remaining > 0) {
          setState('waiting');
        }
        refreshQueue();
      });
    };
    window.addEventListener('online', onOnline);
    const t = window.setInterval(refreshQueue, 10000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state !== 'sent' || lockedUntil <= Date.now()) return;
    const t = window.setTimeout(() => {
      setState(queueCount > 0 ? 'waiting' : 'idle');
      setLockedUntil(0);
    }, lockedUntil - Date.now());
    return () => window.clearTimeout(t);
  }, [state, lockedUntil, queueCount]);

  async function onPress() {
    if (state === 'sent' && Date.now() < lockedUntil) return;
    if (state === 'sending') return;

    setState('sending');
    const client_request_id = crypto.randomUUID();

    try {
      const result = await sendOrQueueDistress({
        client_request_id,
        lat,
        lng,
      });

      if (result.ok) {
        setLockedUntil(Date.now() + LOCK_MS);
        setState('sent');
        setQueueCount(0);
        return;
      }

      setState('waiting');
      const pending = await listDistressQueue();
      setQueueCount(pending.length);
    } catch {
      setState('failed');
    }
  }

  const locked = state === 'sent' && Date.now() < lockedUntil;
  const label =
    state === 'sending'
      ? 'שולחים…'
      : state === 'sent'
        ? 'התראה נשלחה ✓'
        : state === 'waiting'
          ? 'ממתינים לאות'
          : state === 'failed'
            ? 'נכשל — נסו שוב'
            : 'הודעת מצוקה';

  return (
    <div className="distress-wrap">
      {(state === 'waiting' || state === 'failed') && phone && (
        <p className="distress-offline-msg">
          אין קליטה — התקשרו ישירות:{' '}
          <a href={`tel:${phone}`}>{phone}</a>
          {queueCount > 0 ? ` · בתור: ${queueCount}` : ''}
        </p>
      )}
      <button
        type="button"
        className={`distress-btn${locked || state === 'sending' ? ' locked' : ''}`}
        onClick={() => void onPress()}
        disabled={locked || state === 'sending'}
        aria-label="שליחת הודעת מצוקה אוטומטית לקצין התורן"
      >
        {state === 'idle' && <DistressHandIcon />}
        <span>{label}</span>
      </button>
    </div>
  );
}
