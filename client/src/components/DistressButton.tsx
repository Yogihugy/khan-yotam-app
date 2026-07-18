import { useEffect, useState } from 'react';
import { fetchEmergencyPhone } from '../lib/mapData';
import { listDistressQueue } from '../lib/distressQueue';
import { flushDistressQueue, sendOrQueueDistress } from '../lib/distressSend';

type State = 'idle' | 'sending' | 'sent' | 'waiting' | 'failed';

const LOCK_MS = 30_000;

function WhatsAppIcon() {
  return (
    <svg
      className="distress-btn-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 6.045L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
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
        aria-label="שלחו הודעת מצוקה בוואטסאפ לקצין תורן"
      >
        {state === 'idle' && <WhatsAppIcon />}
        <span>{label}</span>
      </button>
    </div>
  );
}
