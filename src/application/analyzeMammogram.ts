import type { Analysis } from '../domain/triage';
import { TriageError, toFailure, type Failure } from './errors';
import type { ImagePreparer, PanelLayout, SettingsRepository, TriageGateway } from './ports';

export type Outcome = { readonly ok: true; readonly analysis: Analysis } | { readonly ok: false; readonly failure: Failure };

export type AnalysisStep = 'preparing' | 'analyzing';

export interface AnalyzeInput {
  readonly file: Blob;
  readonly panelCount?: number;
  readonly layout?: PanelLayout;
}

export interface AnalyzeDependencies {
  readonly gateway: TriageGateway;
  readonly preparer: ImagePreparer;
  readonly settings: SettingsRepository;
  readonly maxImageBytes: number;
  readonly newCorrelationId: () => string;
}

/** Use case: prepare the picked image and ask the triage service for a priority level per breast. */
export function createAnalyzeMammogram(deps: AnalyzeDependencies) {
  return async function analyzeMammogram(input: AnalyzeInput, onStep: (step: AnalysisStep) => void = () => {},
    signal?: AbortSignal): Promise<Outcome> {
    const correlationId = deps.newCorrelationId();
    try {
      const settings = deps.settings.load();
      if (!settings.serverUrl || !settings.accessKey) throw new TriageError('not_configured');
      if (!input.file.type.startsWith('image/')) throw new TriageError('not_an_image');
      if (input.layout && input.panelCount !== undefined
        && (input.layout.sides.length !== input.panelCount || input.layout.views.length !== input.panelCount)) {
        throw new TriageError('invalid_input');
      }
      onStep('preparing');
      const image = await deps.preparer.prepare(input.file, deps.maxImageBytes, signal);
      signal?.throwIfAborted();
      onStep('analyzing');
      const analysis = await deps.gateway.analyze(
        { image, panelCount: input.panelCount, layout: input.layout }, settings, signal);
      return { ok: true, analysis };
    } catch (error) {
      return { ok: false, failure: toFailure(error, correlationId, signal?.aborted) };
    }
  };
}

export type AnalyzeMammogram = ReturnType<typeof createAnalyzeMammogram>;
