const DB_NAME = 'khan-yotam-distress';
const STORE = 'queue';
const DB_VERSION = 1;

export type QueuedDistress = {
  client_request_id: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
  attempts: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'client_request_id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let req: IDBRequest<T> | void;
    try {
      req = fn(store);
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB tx failed'));
    if (req) {
      req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    }
  });
}

export async function enqueueDistress(item: QueuedDistress): Promise<void> {
  await withStore('readwrite', (store) => {
    store.put(item);
  });
}

export async function removeDistress(clientRequestId: string): Promise<void> {
  await withStore('readwrite', (store) => {
    store.delete(clientRequestId);
  });
}

export async function listDistressQueue(): Promise<QueuedDistress[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result || []) as QueuedDistress[]);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB getAll failed'));
  });
}

export async function bumpAttempt(clientRequestId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(clientRequestId);
    getReq.onsuccess = () => {
      const row = getReq.result as QueuedDistress | undefined;
      if (!row) {
        resolve();
        return;
      }
      store.put({ ...row, attempts: (row.attempts || 0) + 1 });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB bump failed'));
  });
}
