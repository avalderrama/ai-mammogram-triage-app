/** Runs public/sw.js against a fake service worker scope to prove what it may and may not cache. */
import { beforeEach, describe, expect, it } from 'vitest';
import source from '../../public/sw.js?raw';

type Handler = (event: { request: Request; respondWith: (r: Promise<Response>) => void; waitUntil: (p: Promise<unknown>) => void }) => void;

const ORIGIN = 'https://app.example';
let handlers: Record<string, Handler>;
let stored: Map<string, Response>;
let network: (request: Request) => Response;

function loadWorker() {
  handlers = {};
  stored = new Map();
  const cache = {
    addAll: async () => undefined,
    put: async (request: Request, response: Response) => { stored.set(request.url, response); },
    keys: async () => [],
  };
  const scope = {
    location: new URL(`${ORIGIN}/`),
    addEventListener: (type: string, handler: Handler) => { handlers[type] = handler; },
    skipWaiting: async () => undefined,
    clients: { claim: async () => undefined },
  };
  const fakeCaches = {
    open: async () => cache,
    keys: async () => [],
    delete: async () => true,
    match: async (request: Request | string) => stored.get(typeof request === 'string' ? request : request.url),
  };
  const fakeFetch = async (request: Request) => network(request);
  new Function('self', 'caches', 'fetch', source)(scope, fakeCaches, fakeFetch);
}

async function dispatch(request: Request): Promise<boolean> {
  let responded: Promise<Response> | null = null;
  handlers.fetch!({ request, respondWith: (r) => { responded = r; }, waitUntil: () => undefined });
  if (responded) await responded;
  await new Promise((r) => setTimeout(r, 0));
  return responded !== null;
}

const ok = (type: string) => {
  const response = new Response('x', { headers: { 'content-type': type } });
  Object.defineProperty(response, 'type', { value: 'basic' });
  return response;
};

beforeEach(() => {
  network = () => ok('text/javascript');
  loadWorker();
});

describe('service worker', () => {
  it('caches hashed app assets', async () => {
    expect(await dispatch(new Request(`${ORIGIN}/assets/index-abc.js`))).toBe(true);
    expect(stored.has(`${ORIGIN}/assets/index-abc.js`)).toBe(true);
  });

  it('never intercepts the MCP server (cross-origin) or POST requests', async () => {
    expect(await dispatch(new Request('https://tunnel.example/mcp', { method: 'POST', body: '{}' }))).toBe(false);
    expect(await dispatch(new Request(`${ORIGIN}/mcp`, { method: 'POST', body: '{}' }))).toBe(false);
    expect(stored.size).toBe(0);
  });

  it('never stores images other than the app icon', async () => {
    network = () => ok('image/png');
    await dispatch(new Request(`${ORIGIN}/assets/photo.png`));
    expect(stored.size).toBe(0);
    network = () => ok('image/svg+xml');
    await dispatch(new Request(`${ORIGIN}/icon.svg`));
    expect([...stored.keys()]).toEqual([`${ORIGIN}/icon.svg`]);
  });

  it('never intercepts the same-origin MCP server, not even its GET requests', async () => {
    expect(await dispatch(new Request(`${ORIGIN}/mcp`))).toBe(false);
    expect(await dispatch(new Request(`${ORIGIN}/health`))).toBe(false);
    expect(stored.size).toBe(0);
  });

  it('ignores other same-origin paths', async () => {
    expect(await dispatch(new Request(`${ORIGIN}/e2e/test.png`))).toBe(false);
  });
});
