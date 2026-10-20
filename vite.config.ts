import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Strict Content Security Policy for production builds only (the dev server injects inline scripts).
 * connect-src allows any HTTPS origin because the MCP server URL is configured by the user (tunnel URL).
 */
function contentSecurityPolicy(): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' blob: data:",
    "connect-src 'self' https: http://127.0.0.1:* http://localhost:*",
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

export default defineConfig({
  base: './',
  plugins: [react(), contentSecurityPolicy()],
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
});
