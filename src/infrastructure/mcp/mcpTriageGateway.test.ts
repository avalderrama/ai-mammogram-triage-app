import { SdkError, SdkErrorCode, UnauthorizedError } from '@modelcontextprotocol/client';
import { describe, expect, it } from 'vitest';
import { TriageError } from '../../application/errors';
import { toTriageError } from './mcpTriageGateway';

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

  it('passes TriageError through', () => {
    const error = new TriageError('not_a_mammogram');
    expect(toTriageError(error, http(200))).toBe(error);
  });
});
