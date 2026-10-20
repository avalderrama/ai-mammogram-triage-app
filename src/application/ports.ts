import type { Analysis, BreastSide, ViewType } from '../domain/triage';

/** Image ready to travel: base64 without data-URL prefix. */
export interface PreparedImage {
  readonly base64: string;
}

export interface PanelLayout {
  readonly sides: readonly BreastSide[];
  readonly views: readonly ViewType[];
}

export interface AnalysisRequest {
  readonly image: PreparedImage;
  /** Number of side-by-side views; omitted means "detect automatically". */
  readonly panelCount?: number;
  readonly layout?: PanelLayout;
}

export interface ConnectionSettings {
  readonly serverUrl: string;
  readonly accessKey: string;
}

/** Remote triage service (the MCP server). Implementations throw TriageError for expected failures. */
export interface TriageGateway {
  analyze(request: AnalysisRequest, settings: ConnectionSettings, signal?: AbortSignal): Promise<Analysis>;
  testConnection(settings: ConnectionSettings, signal?: AbortSignal): Promise<void>;
}

/** Turns a picked file into an image the server accepts (orientation, size limit). Never stores it. */
export interface ImagePreparer {
  prepare(file: Blob, maxBytes: number, signal?: AbortSignal): Promise<PreparedImage>;
}

export interface SettingsRepository {
  load(): ConnectionSettings & { readonly rememberKey: boolean };
  save(settings: ConnectionSettings & { readonly rememberKey: boolean }): void;
}
