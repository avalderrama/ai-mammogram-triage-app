import { SdkError, SdkErrorCode, UnauthorizedError } from '@modelcontextprotocol/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TriageError } from '../../application/errors';
import { McpTriageGateway, toTriageError } from './mcpTriageGateway';

const http = (status: number, retryAfter?: number) => ({ status, retryAfter });

describe('toTriageError', () => {
  it.each([
    [401, 'unauthorized'], [403, 'server_misconfigured'], [421, 'server_misconfigured'], [413, 'too_large'],
    [429, 'rate_limited'], [502, 'server_unreachable'],
  ])('maps HTTP %i to %s', (status, kind) => {
    expect(toTriageError(new Error('x'), http(status)).kind).toBe(kind);
  });

  it('keeps Retry-After for rate limits', () => {
    expect(toTriageError(new Error('x'), http(429, 17)).retryAfterSeconds).toBe(17);
  });

  it('maps SDK unauthorized and timeouts', () => {
    expect(toTriageError(new UnauthorizedError(), {}).kind).toBe('unauthorized');
    expect(toTriageError(new SdkError(SdkErrorCode.RequestTimeout, 'timeout'), { status: 200 }).kind).toBe('timeout');
  });

  it('maps network failures and aborts', () => {
    expect(toTriageError(new TypeError('Failed to fetch'), {}).kind).toBe('server_unreachable');
    const controller = new AbortController();
    controller.abort();
    expect(toTriageError(new Error('x'), {}, controller.signal).kind).toBe('cancelled');
  });

  it('maps a redirect (Cloudflare Access asking to sign in again) to session_expired', () => {
    expect(toTriageError(new TypeError('Failed to fetch'), { redirected: true, status: 0 }).kind).toBe('session_expired');
  });

  it('passes TriageError through', () => {
    const error = new TriageError('not_a_mammogram');
    expect(toTriageError(error, http(200))).toBe(error);
  });
});

describe('McpTriageGateway authentication', () => {
  const settings = (accessKey: string) => ({ serverUrl: 'https://app.example/mcp', accessKey });
  const authorization = (init?: RequestInit) => new Headers(init?.headers).get('authorization');

  afterEach(() => vi.unstubAllGlobals());

  it('sends no Authorization header without a key, and never follows redirects', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(new McpTriageGateway(5_000).testConnection(settings(''))).rejects.toMatchObject({ kind: 'unauthorized' });
    const init = fetchMock.mock.calls[0]![1];
    expect(authorization(init)).toBeNull();
    expect(init?.redirect).toBe('manual');
  });

  it('sends the key as a bearer token when there is one', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(new McpTriageGateway(5_000).testConnection(settings('k'.repeat(32)))).rejects.toBeInstanceOf(TriageError);
    expect(authorization(fetchMock.mock.calls[0]![1])).toBe(`Bearer ${'k'.repeat(32)}`);
  });

  it('reports session_expired when Cloudflare Access redirects to its sign-in page', async () => {
    const opaqueRedirect = { type: 'opaqueredirect', status: 0, ok: false, headers: new Headers(), body: null,
      text: async () => '', json: async () => ({}) } as unknown as Response;
    vi.stubGlobal('fetch', vi.fn(async () => opaqueRedirect));
    await expect(new McpTriageGateway(5_000).testConnection(settings(''))).rejects.toMatchObject({ kind: 'session_expired' });
  });
});
