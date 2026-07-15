import { postDistress } from './api';
import {
  bumpAttempt,
  enqueueDistress,
  listDistressQueue,
  removeDistress,
  type QueuedDistress,
} from './distressQueue';

let flushing = false;

export async function sendOrQueueDistress(input: {
  client_request_id: string;
  lat: number | null;
  lng: number | null;
}): Promise<{ queued: boolean; ok: boolean }> {
  const item: QueuedDistress = {
    client_request_id: input.client_request_id,
    lat: input.lat,
    lng: input.lng,
    created_at: new Date().toISOString(),
    attempts: 0,
  };

  if (!navigator.onLine) {
    await enqueueDistress(item);
    return { queued: true, ok: false };
  }

  try {
    await postDistress({
      client_request_id: item.client_request_id,
      lat: item.lat,
      lng: item.lng,
    });
    await removeDistress(item.client_request_id).catch(() => undefined);
    return { queued: false, ok: true };
  } catch {
    await enqueueDistress(item);
    return { queued: true, ok: false };
  }
}

export async function flushDistressQueue(): Promise<{ sent: number; remaining: number }> {
  if (flushing) return { sent: 0, remaining: -1 };
  if (!navigator.onLine) {
    const pending = await listDistressQueue();
    return { sent: 0, remaining: pending.length };
  }

  flushing = true;
  let sent = 0;
  try {
    const pending = await listDistressQueue();
    for (const item of pending) {
      try {
        await postDistress({
          client_request_id: item.client_request_id,
          lat: item.lat,
          lng: item.lng,
        });
        await removeDistress(item.client_request_id);
        sent += 1;
      } catch {
        await bumpAttempt(item.client_request_id);
      }
    }
    const remaining = await listDistressQueue();
    return { sent, remaining: remaining.length };
  } finally {
    flushing = false;
  }
}

/** Start listening for reconnect and periodically flush the queue. */
export function startDistressQueueWorker(): () => void {
  const onOnline = () => {
    void flushDistressQueue();
  };
  window.addEventListener('online', onOnline);
  const interval = window.setInterval(() => {
    if (navigator.onLine) void flushDistressQueue();
  }, 15000);

  void flushDistressQueue();

  return () => {
    window.removeEventListener('online', onOnline);
    window.clearInterval(interval);
  };
}
