import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/** Moves focus to the view heading and updates the document title on every view change (UX-NAV-001). */
export function useViewHeading<T extends HTMLElement>(title: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    document.title = `${title} · Triaje de mamografías`;
    ref.current?.focus();
  }, [title]);
  return ref;
}

/** Whole seconds elapsed since `since` (null = stopped). */
export function useElapsedSeconds(since: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [since]);
  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000));
}
