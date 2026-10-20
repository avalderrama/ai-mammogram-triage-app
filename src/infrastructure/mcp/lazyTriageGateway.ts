import type { Analysis } from '../../domain/triage';
import { TriageError } from '../../application/errors';
import type { AnalysisRequest, ConnectionSettings, TriageGateway } from '../../application/ports';

/** Loads the MCP SDK only when the first request is made, keeping the initial page light (UX-PRF-004). */
export class LazyTriageGateway implements TriageGateway {
  private loading: Promise<TriageGateway> | null = null;

  private gateway(): Promise<TriageGateway> {
    // A failed download is either the network (retry later) or a newer deployment that removed this tab's chunk
    // (only a page reload fixes it). Offline is reported as such; otherwise the user is asked to reload.
    this.loading ??= import('./mcpTriageGateway').then((m) => new m.McpTriageGateway() as TriageGateway)
      .catch((cause: unknown) => {
        this.loading = null;
        throw new TriageError(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'app_outdated', { cause });
      });
    return this.loading;
  }

  async analyze(request: AnalysisRequest, settings: ConnectionSettings, signal?: AbortSignal): Promise<Analysis> {
    return (await this.gateway()).analyze(request, settings, signal);
  }

  async testConnection(settings: ConnectionSettings, signal?: AbortSignal): Promise<void> {
    return (await this.gateway()).testConnection(settings, signal);
  }
}
