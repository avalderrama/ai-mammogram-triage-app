import { useCallback, useSyncExternalStore } from 'react';

/** Hash routes keep the app working on static hosting and make the browser Back button work (UX-NAV-006). */
export const ROUTES = {
  home: '#/',
  review: '#/review',
  analyzing: '#/analyzing',
  result: '#/result',
  settings: '#/settings',
} as const;

export type Route = keyof typeof ROUTES | 'not_found';

function current(): Route {
  const hash = window.location.hash || ROUTES.home;
  const found = (Object.keys(ROUTES) as (keyof typeof ROUTES)[]).find((r) => ROUTES[r] === hash);
  return found ?? 'not_found';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): [Route, (to: keyof typeof ROUTES, options?: { replace?: boolean }) => void] {
  const route = useSyncExternalStore(subscribe, current, () => 'home' as Route);
  const navigate = useCallback((to: keyof typeof ROUTES, options: { replace?: boolean } = {}) => {
    if (options.replace) {
      window.history.replaceState(null, '', ROUTES[to]);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = ROUTES[to];
    }
  }, []);
  return [route, navigate];
}
