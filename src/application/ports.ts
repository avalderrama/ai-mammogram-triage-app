import type { CropBox } from '../domain/crop';
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
  /** The views are in a 2 x 2 grid (panelCount 4), read left to right and top to bottom. */
  readonly grid?: boolean;
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

/**
 * Turns a picked file into an image the server accepts (orientation, size limit). With a crop, only that part is
 * sent, taken from the full-resolution image. Never stores it.
 */
export interface ImagePreparer {
  prepare(file: Blob, maxBytes: number, crop?: CropBox, signal?: AbortSignal): Promise<PreparedImage>;
}

/**
 * Where the crop proposal came from: the mammogram area was found inside a frame (`detected`), the image has no frame
 * to remove (`no_frame`, e.g. a screenshot), or nothing reliable was found and the whole image is proposed
 * (`uncertain`, the user should adjust it).
 */
export type CropSource = 'detected' | 'no_frame' | 'uncertain';

export interface CropProposal {
  readonly box: CropBox;
  readonly source: CropSource;
}

/** Proposes the area of a photo that holds the mammogram, leaving out the monitor or viewer around it. */
export interface CropDetector {
  propose(file: Blob, signal?: AbortSignal): Promise<CropProposal>;
}

export interface SettingsRepository {
  load(): ConnectionSettings & { readonly rememberKey: boolean };
  save(settings: ConnectionSettings & { readonly rememberKey: boolean }): void;
}
