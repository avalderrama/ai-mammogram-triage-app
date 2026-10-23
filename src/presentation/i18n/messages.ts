/** Shape of every UI string. Each locale implements it fully, so a missing translation is a type error. */
import type { FailureKind } from '../../application/errors';
import type { CropBox, CropCorner, CropEdge } from '../../domain/crop';
import type { BreastSide, QualityIssue, SuspiciousRegion, TriageLevel, ViewType } from '../../domain/triage';

export type Locale = 'en' | 'es';
export const LOCALES: readonly Locale[] = ['en', 'es'];
export const DEFAULT_LOCALE: Locale = 'en';

export interface Messages {
  readonly locale: Locale;
  readonly app: {
    readonly name: string;
    readonly tag: string;
    readonly titleSuffix: string;
    readonly skipLink: string;
    readonly navLabel: string;
    readonly navHome: string;
    readonly navSettings: string;
    readonly languageLabel: string;
    readonly footer: string;
    readonly contactTitle: string;
    readonly contactWhatsapp: (username: string) => string;
    readonly offlineTitle: string;
    readonly offlineBody: string;
  };
  readonly disclaimer: string;
  readonly levels: Record<TriageLevel, { readonly label: string; readonly explanation: string }>;
  readonly quality: Record<QualityIssue, { readonly problem: string; readonly action: string }>;
  readonly sides: Record<BreastSide, string>;
  readonly views: Record<ViewType, string>;
  readonly breastTitle: (side: BreastSide, panel: string) => string;
  readonly failures: Record<FailureKind, { readonly title: string; readonly body: (retryAfterSeconds?: number) => string }>;
  readonly reload: string;
  readonly failurePanel: {
    readonly reviewedPanels: (count: number) => string;
    readonly reference: string;
  };
  readonly picker: {
    readonly takePhoto: string;
    readonly choosePhoto: string;
    readonly takePhotoHint: string;
    readonly choosePhotoHint: string;
  };
  readonly home: {
    readonly docTitle: string;
    readonly title: string;
    readonly lead: string;
    readonly beforeStartTitle: string;
    readonly beforeStartBody: string;
    readonly settingsLink: string;
    readonly eyebrow: string;
    readonly howTitle: string;
    readonly howSteps: readonly { readonly title: string; readonly body: string }[];
    readonly tipsTitle: string;
    readonly tips: readonly string[];
    readonly privacy: string;
  };
  readonly review: {
    readonly docTitle: string;
    readonly title: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly previewAlt: string;
    readonly panelCountLegend: string;
    readonly panelCounts: {
      readonly auto: string; readonly one: string; readonly two: string; readonly four: string; readonly grid: string;
    };
    readonly layoutSummary: string;
    readonly layoutHint: string;
    readonly panelLegend: (n: number) => string;
    readonly gridLayoutHint: string;
    /** Position of view `index` (0-3) in a 2 x 2 grid. */
    readonly gridPanelLegend: (index: number) => string;
    readonly sideLabel: string;
    readonly viewLabel: string;
    readonly unknownOption: string;
    readonly right: string;
    readonly left: string;
    readonly cc: string;
    readonly mlo: string;
    readonly blockedNotConfigured: string;
    readonly blockedOffline: string;
    readonly blockedDetecting: string;
    readonly blockedRejected: string;
    readonly goToSettings: string;
    readonly analyze: string;
    readonly wrongImage: string;
    readonly cropDetecting: string;
    readonly cropDetected: string;
    readonly cropUncertainTitle: string;
    readonly cropUncertain: string;
    readonly cropHelp: string;
    readonly cropReset: string;
    readonly cropFull: string;
    readonly cropCorner: (corner: CropCorner) => string;
    readonly cropArea: (box: CropBox) => string;
    readonly cropEdgesSummary: string;
    readonly cropEdge: (edge: CropEdge) => string;
    readonly cropInward: string;
    readonly cropOutward: string;
  };
  readonly analyzing: {
    readonly docTitle: string;
    readonly title: string;
    readonly lead: string;
    readonly stepsLabel: string;
    readonly stepPreparing: string;
    readonly stepAnalyzing: string;
    readonly done: string;
    readonly current: string;
    readonly pending: string;
    readonly elapsed: (seconds: number) => string;
    readonly cancel: string;
  };
  readonly result: {
    readonly docTitle: string;
    readonly title: string;
    readonly loading: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly pickImage: string;
    readonly retry: string;
    readonly goToSettings: string;
    readonly pickOther: string;
    readonly overall: string;
    readonly partialTitle: string;
    readonly rejectedPanels: (panels: readonly number[]) => string;
    readonly globalOnly: string;
    readonly qualityTitle: string;
    readonly masked: (count: number) => string;
    readonly modelVersion: (version: string) => string;
    readonly analyzeAnother: string;
    readonly backToImage: string;
    readonly adjustCrop: string;
    readonly probabilitiesLabel: string;
    readonly groups: { readonly routine: string; readonly shortFollowUp: string; readonly biopsy: string };
    readonly viewName: (side: BreastSide, panel: number, view: ViewType) => string;
    readonly heatmapUnavailable: (name: string, lowResolution: boolean) => string;
    readonly heatmapAlt: (name: string) => string;
    readonly heatmapCaption: (name: string) => string;
    readonly breastAlt: (name: string) => string;
    readonly cleanCaption: (name: string) => string;
    readonly showHeatmap: string;
    readonly viewerLayers: string;
    readonly regionsTitle: string;
    readonly regionsNote: string;
    readonly showMarkers: string;
    readonly region: (n: number, depth: SuspiciousRegion['depth'], vertical: SuspiciousRegion['vertical']) => string;
    readonly noRegions: string;
    readonly summaryNextStep: string;
  };
  readonly settings: {
    readonly docTitle: string;
    readonly title: string;
    readonly lead: string;
    readonly required: string;
    readonly optional: string;
    readonly serverLabel: string;
    readonly serverHint: string;
    readonly keyLabel: string;
    readonly keyHint: string;
    readonly show: string;
    readonly hide: string;
    readonly remember: string;
    readonly save: string;
    readonly testing: string;
    readonly connecting: string;
    readonly okTitle: string;
    readonly okBody: string;
    readonly tryAgain: string;
    readonly savedAnyway: string;
    readonly errors: {
      readonly serverMissing: string;
      readonly serverInvalid: string;
      readonly keyShort: string;
    };
  };
  readonly notFound: { readonly docTitle: string; readonly title: string; readonly body: string; readonly home: string };
  readonly percent: (value: number) => string;
  readonly megabytes: (bytes: number) => string;
}

/** Where the user can fix each failure (language-independent). */
/** 'crop': the picked image is kept and the area to analyze can be adjusted on the review screen. */
export const FAILURE_FIX: Record<FailureKind, 'settings' | 'image' | 'crop' | 'retry' | 'reload'> = {
  not_configured: 'settings',
  not_an_image: 'image',
  not_a_mammogram: 'crop',
  unreadable_image: 'image',
  too_large: 'crop',
  too_many_pixels: 'image',
  invalid_input: 'image',
  unauthorized: 'settings',
  session_expired: 'reload',
  server_misconfigured: 'settings',
  server_busy: 'retry',
  app_outdated: 'reload',
  rate_limited: 'retry',
  offline: 'retry',
  server_unreachable: 'retry',
  timeout: 'retry',
  cancelled: 'retry',
  unexpected: 'retry',
};
