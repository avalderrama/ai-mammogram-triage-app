import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig, type Plugin } from 'vitest/config';

const ANY_SERVER = "'self' https: http://127.0.0.1:* http://localhost:*";

/**
 * Where the app may connect. A build for a fixed server (VITE_DEFAULT_SERVER_URL over HTTPS, e.g. the production
 * app behind Cloudflare Access, same origin) may only reach that server, so an injected script could not send data
 * elsewhere. Without it (local development, quick-tunnel pilots) the user types the server URL, so any HTTPS origin
 * is allowed.
 */
export function connectSources(defaultServerUrl: string | undefined): string {
  if (!defaultServerUrl?.startsWith('https://')) return ANY_SERVER;
  return `'self' ${new URL(defaultServerUrl).origin}`;
}

/** Strict Content Security Policy for production builds only (the dev server injects inline scripts). */
function contentSecurityPolicy(connectSrc: string): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' blob: data:",
    `connect-src ${connectSrc}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`),
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), contentSecurityPolicy(connectSources(loadEnv(mode, '.').VITE_DEFAULT_SERVER_URL))],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  // The pilot serves the built app through a Cloudflare quick tunnel; other Host headers stay blocked.
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, allowedHosts: ['.trycloudflare.com'] },
  build: { sourcemap: false, target: 'es2022' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
}));
