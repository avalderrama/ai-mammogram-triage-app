import type { Analysis } from '../../domain/triage';
import type { AnalysisRequest, ConnectionSettings, TriageGateway } from '../../application/ports';

/** Loads the MCP SDK only when the first request is made, keeping the initial page light (UX-PRF-004). */
export class LazyTriageGateway implements TriageGateway {
  private loading: Promise<TriageGateway> | null = null;

  private gateway(): Promise<TriageGateway> {
    this.loading ??= import('./mcpTriageGateway').then((m) => new m.McpTriageGateway());
    this.loading.catch(() => { this.loading = null; }); // a failed chunk download can be retried
    return this.loading;
  }

  async analyze(request: AnalysisRequest, settings: ConnectionSettings, signal?: AbortSignal): Promise<Analysis> {
    return (await this.gateway()).analyze(request, settings, signal);
  }

  async testConnection(settings: ConnectionSettings, signal?: AbortSignal): Promise<void> {
    return (await this.gateway()).testConnection(settings, signal);
  }
}
