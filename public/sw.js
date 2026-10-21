/*
 * App-shell service worker. Privacy rules (CLAUDE.md):
 *  - Only same-origin GET requests for the shell (HTML, JS, CSS, manifest, icons) are cached.
 *  - Images picked by the user are never fetched through here (they stay in memory), and responses with an
 *    image content type other than the app icon are never stored.
 *  - The MCP server is never intercepted, whether it is cross-origin or on this origin (/mcp, /health behind
 *    Cloudflare Access): its answers are per request and must never come from a cache.
 */
const CACHE = 'mammo-triage-shell-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function cacheable(request, response) {
  const type = response.headers.get('content-type') || '';
  const isIcon = new URL(request.url).pathname.endsWith('/icon.svg');
  return response.ok && response.type === 'basic' && (!type.startsWith('image/') || isIcon);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/mcp') || url.pathname.endsWith('/health')) return;

  if (request.mode === 'navigate') {
    // Network first so updates arrive; cached shell when offline.
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }
  if (!url.pathname.includes('/assets/') && !SHELL.some((p) => url.pathname.endsWith(p.slice(1)))) return;

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (cacheable(request, response)) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  })));
});
