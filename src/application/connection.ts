import { toFailure, TriageError, type Failure } from './errors';
import type { ConnectionSettings, SettingsRepository, TriageGateway } from './ports';

export type ConnectionCheck = { readonly ok: true } | { readonly ok: false; readonly failure: Failure };

/** Use cases of the Settings view: read, save and test the connection to the MCP server. */
export function createConnectionSettings(gateway: TriageGateway, repository: SettingsRepository,
  newCorrelationId: () => string) {
  return {
    load: () => repository.load(),
    save: (settings: ConnectionSettings & { rememberKey: boolean }) =>
      repository.save({ ...settings, serverUrl: settings.serverUrl.trim(), accessKey: settings.accessKey.trim() }),
    /** A connection test should answer quickly: it gives up after `timeoutMs` (default 20 s). */
    async test(settings: ConnectionSettings, timeoutMs = 20_000): Promise<ConnectionCheck> {
      try {
        await gateway.testConnection({ serverUrl: settings.serverUrl.trim(), accessKey: settings.accessKey.trim() },
          AbortSignal.timeout(timeoutMs));
        return { ok: true };
      } catch (error) {
        const timedOut = (error as { name?: unknown } | null)?.name === 'TimeoutError'
          || (error instanceof TriageError && error.kind === 'cancelled');
        return { ok: false, failure: toFailure(timedOut ? new TriageError('timeout') : error, newCorrelationId()) };
      }
    },
  };
}

export type ConnectionSettingsUseCases = ReturnType<typeof createConnectionSettings>;
