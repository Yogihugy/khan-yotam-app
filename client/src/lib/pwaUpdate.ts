type NeedRefreshListener = (needRefresh: boolean) => void;

type UpdateHandler = (reloadPage?: boolean) => Promise<void>;

const listeners = new Set<NeedRefreshListener>();

let updateHandler: UpdateHandler | null = null;
let needRefresh = false;

export function setPwaUpdateHandler(handler: UpdateHandler) {
  updateHandler = handler;
}

export function notifyPwaNeedRefresh() {
  needRefresh = true;
  for (const listener of listeners) listener(true);
}

export function subscribePwaNeedRefresh(listener: NeedRefreshListener): () => void {
  listeners.add(listener);
  listener(needRefresh);
  return () => {
    listeners.delete(listener);
  };
}

export async function applyPwaUpdate() {
  if (!updateHandler) return;
  await updateHandler(true);
}

/** Ask the browser to check for a new service worker (important for sticky iOS PWAs). */
export function checkForPwaUpdate() {
  if (!('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.getRegistration().then((registration) => {
    void registration?.update();
  });
}

export function startPwaResumeUpdateChecks() {
  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      checkForPwaUpdate();
    }
  };

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', checkForPwaUpdate);

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', checkForPwaUpdate);
  };
}
