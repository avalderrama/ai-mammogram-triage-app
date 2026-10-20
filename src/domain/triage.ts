/** Triage result model and its pure rules. No framework or transport knowledge lives here. */

export type TriageLevel = 'high_priority' | 'review' | 'no_suspicious_findings';
export type BreastSide = 'R' | 'L' | 'unknown';
export type ViewType = 'CC' | 'MLO' | 'unknown';
export type QualityIssue = 'low_resolution' | 'blurry' | 'glare' | 'small_breast';
export type ScoringMode = 'fused' | 'global_only';

export const TRIAGE_LEVELS: readonly TriageLevel[] = ['high_priority', 'review', 'no_suspicious_findings'];
export const QUALITY_ISSUES: readonly QualityIssue[] = ['low_resolution', 'blurry', 'glare', 'small_breast'];

export interface BiradsProbabilities {
  /** BI-RADS 1-2: routine screening. */
  readonly routine: number;
  /** BI-RADS 3: short-term follow-up. */
  readonly shortFollowUp: number;
  /** BI-RADS 4-5: biopsy recommended. */
  readonly biopsy: number;
}

export interface HeatmapImage {
  /** In-memory data URL; never persisted. */
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

export interface ViewResult {
  readonly panel: number;
  readonly side: BreastSide;
  readonly view: ViewType;
  readonly probabilities: BiradsProbabilities;
  readonly qualityIssues: readonly QualityIssue[];
  readonly heatmap: HeatmapImage | null;
  readonly heatmapUnavailableReason: string | null;
}

export interface BreastResult {
  readonly label: string;
  readonly side: BreastSide;
  readonly level: TriageLevel;
  readonly scoringMode: ScoringMode;
  readonly probabilities: BiradsProbabilities;
  readonly qualityIssues: readonly QualityIssue[];
  readonly views: readonly ViewResult[];
}

export interface RejectedPanel {
  readonly panel: number;
  readonly mammogramConfidence: number;
}

export interface Analysis {
  readonly overallLevel: TriageLevel;
  readonly breasts: readonly BreastResult[];
  readonly rejectedPanels: readonly RejectedPanel[];
  readonly maskedTextRegions: number;
  readonly modelVersion: string;
}

export function severity(level: TriageLevel): number {
  return TRIAGE_LEVELS.length - 1 - TRIAGE_LEVELS.indexOf(level);
}

/** Most urgent breast first; ties keep right before left, as radiology reports do. */
export function breastsByUrgency(analysis: Analysis): BreastResult[] {
  const sideOrder: Record<BreastSide, number> = { R: 0, L: 1, unknown: 2 };
  return [...analysis.breasts].sort(
    (a, b) => severity(b.level) - severity(a.level) || sideOrder[a.side] - sideOrder[b.side],
  );
}

/** A result is partial when part of the image could not be assessed (rejected panels or no heatmap). */
export function isPartial(analysis: Analysis): boolean {
  return analysis.rejectedPanels.length > 0 || analysis.breasts.some((b) => b.scoringMode === 'global_only');
}

/** Distinct quality issues across the whole study, in a stable order. */
export function studyQualityIssues(analysis: Analysis): QualityIssue[] {
  const found = new Set(analysis.breasts.flatMap((b) => b.qualityIssues));
  return QUALITY_ISSUES.filter((q) => found.has(q));
}
