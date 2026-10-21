import { describe, expect, it } from 'vitest';
import { connectSources } from './vite.config';

describe('connectSources (CSP connect-src)', () => {
  it('limits a build for a fixed HTTPS server to that origin', () => {
    expect(connectSources('https://app.example/mcp')).toBe("'self' https://app.example");
  });

  it.each([undefined, '', 'http://127.0.0.1:8765/mcp'])('allows any HTTPS server when the URL is %j', (url) => {
    expect(connectSources(url)).toBe("'self' https: http://127.0.0.1:* http://localhost:*");
  });
});
