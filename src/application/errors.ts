import type { RejectedPanel } from '../domain/triage';

export type FailureKind =
  | 'not_configured'
  | 'not_an_image'
  | 'not_a_mammogram'
  | 'unreadable_image'
  | 'too_large'
  | 'invalid_input'
  | 'unauthorized'
  | 'server_misconfigured'
  | 'server_busy'
  | 'app_outdated'
  | 'rate_limited'
  | 'offline'
  | 'server_unreachable'
  | 'timeout'
  | 'cancelled'
  | 'unexpected';

/** Expected failure raised by ports; the presentation layer turns `kind` into actionable copy. */
export class TriageError extends Error {
  readonly kind: FailureKind;
  readonly retryAfterSeconds?: number;
  readonly rejectedPanels?: readonly RejectedPanel[];

  constructor(kind: FailureKind, options: { retryAfterSeconds?: number; rejectedPanels?: readonly RejectedPanel[];
    cause?: unknown } = {}) {
    super(kind, { cause: options.cause });
    this.name = 'TriageError';
    this.kind = kind;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.rejectedPanels = options.rejectedPanels;
  }
}

export interface Failure {
  readonly kind: FailureKind;
  /** Short identifier the user can quote to support (UX-EST-004). Never contains personal data. */
  readonly correlationId: string;
  readonly retryAfterSeconds?: number;
  readonly rejectedPanels?: readonly RejectedPanel[];
  /** Whether trying again with the same input can succeed. */
  readonly retryable: boolean;
}

const RETRYABLE: ReadonlySet<FailureKind> = new Set([
  'rate_limited', 'server_busy', 'offline', 'server_unreachable', 'timeout', 'cancelled', 'unexpected',
]);

const isAbort = (error: unknown) => typeof error === 'object' && error !== null
  && (error as { name?: unknown }).name === 'AbortError';

export function toFailure(error: unknown, correlationId: string, aborted = false): Failure {
  const kind: FailureKind = error instanceof TriageError ? error.kind
    : aborted || isAbort(error) ? 'cancelled' : 'unexpected';
  const triage = error instanceof TriageError ? error : undefined;
  return {
    kind,
    correlationId,
    retryAfterSeconds: triage?.retryAfterSeconds,
    rejectedPanels: triage?.rejectedPanels,
    retryable: RETRYABLE.has(kind),
  };
}
