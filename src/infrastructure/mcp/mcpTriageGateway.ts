import { Client, SdkError, SdkErrorCode, SdkHttpError, StreamableHTTPClientTransport, UnauthorizedError }
  from '@modelcontextprotocol/client';
import type { Analysis } from '../../domain/triage';
import { TriageError } from '../../application/errors';
import type { AnalysisRequest, ConnectionSettings, TriageGateway } from '../../application/ports';
import { parseServerUrl } from '../../application/serverUrl';
import { toAnalysis } from './resultMapping';

const ANALYZE_TOOL = 'mammo_analyze_mammogram';
const CLIENT_INFO = { name: 'ai-mammogram-triage-app', version: '0.1.0' };

interface HttpObservation { status?: number; retryAfter?: number; redirected?: boolean }

/**
 * Records status and Retry-After of the last HTTP response, which the SDK errors do not expose.
 * The MCP endpoint never redirects; a redirect means a gateway in front of it (Cloudflare Access) wants the user to
 * sign in again. Following it would end in an opaque CORS failure, so it is stopped and recorded instead.
 */
function observingFetch(observation: HttpObservation): typeof fetch {
  return async (input, init) => {
    const response = await fetch(input, { ...init, redirect: 'manual' });
    observation.redirected = response.type === 'opaqueredirect';
    observation.status = response.status;
    const retry = Number(response.headers.get('retry-after'));
    observation.retryAfter = Number.isFinite(retry) && retry > 0 ? retry : undefined;
    return response;
  };
}

export function toTriageError(error: unknown, observation: HttpObservation, signal?: AbortSignal): TriageError {
  if (error instanceof TriageError) return error;
  if (signal?.aborted || (error as { name?: unknown } | null)?.name === 'AbortError') {
    return new TriageError('cancelled', { cause: error });
  }
  if (observation.redirected) return new TriageError('session_expired', { cause: error });
  const status = error instanceof SdkHttpError ? error.status : observation.status;
  if (error instanceof UnauthorizedError || status === 401) return new TriageError('unauthorized', { cause: error });
  // 421: Host not in MAMMO_ALLOWED_HOSTS; 403: Origin not allowed (only seen outside browsers' CORS checks).
  if (status === 421 || status === 403) return new TriageError('server_misconfigured', { cause: error });
  if (status === 413) return new TriageError('too_large', { cause: error });
  if (status === 429) return new TriageError('rate_limited', { retryAfterSeconds: observation.retryAfter, cause: error });
  if (error instanceof SdkError && error.code === SdkErrorCode.RequestTimeout) {
    return new TriageError('timeout', { cause: error });
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return new TriageError('offline', { cause: error });
  if (error instanceof TypeError || status === undefined || status >= 500) {
    return new TriageError('server_unreachable', { cause: error });
  }
  return new TriageError('unexpected', { cause: error });
}

function serverUrl(value: string): URL {
  const url = parseServerUrl(value);
  if (!url) throw new TriageError('not_configured'); // never send the key over clear-text HTTP to a remote host
  return url;
}

/** Talks to the mammogram triage MCP server over streamable HTTP, one short-lived connection per call. */
export class McpTriageGateway implements TriageGateway {
  constructor(private readonly timeoutMs = 120_000) {}

  private async withClient<T>(settings: ConnectionSettings, signal: AbortSignal | undefined,
    work: (client: Client) => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new TriageError('offline');
    const observation: HttpObservation = {};
    // Without a key, no Authorization header is sent: the Cloudflare Access session (same-origin cookie) identifies
    // the user instead.
    const transport = new StreamableHTTPClientTransport(serverUrl(settings.serverUrl), {
      ...(settings.accessKey && { authProvider: { token: async () => settings.accessKey } }),
      fetch: observingFetch(observation),
    });
    const client = new Client(CLIENT_INFO);
    try {
      await client.connect(transport, { signal, timeout: this.timeoutMs });
      return await work(client);
    } catch (error) {
      throw toTriageError(error, observation, signal);
    } finally {
      await client.close().catch(() => undefined);
    }
  }

  analyze(request: AnalysisRequest, settings: ConnectionSettings, signal?: AbortSignal): Promise<Analysis> {
    return this.withClient(settings, signal, async (client) => {
      const result = await client.callTool({
        name: ANALYZE_TOOL,
        arguments: {
          image_base64: request.image.base64,
          ...(request.panelCount !== undefined && { panel_count: request.panelCount }),
          ...(request.grid && { panel_arrangement: 'grid' }),
          ...(request.layout && { sides: [...request.layout.sides], views: [...request.layout.views] }),
          include_heatmap: true,
          // The red areas as their own layer, so the doctor can hide them and see the tissue underneath.
          heatmap_format: 'layers',
          response_format: 'json',
        },
      }, { signal, timeout: this.timeoutMs });
      return toAnalysis(result);
    });
  }

  testConnection(settings: ConnectionSettings, signal?: AbortSignal): Promise<void> {
    return this.withClient(settings, signal, async (client) => {
      const { tools } = await client.listTools(undefined, { signal, timeout: this.timeoutMs });
      if (!tools.some((t) => t.name === ANALYZE_TOOL)) throw new TriageError('server_unreachable');
    });
  }
}
