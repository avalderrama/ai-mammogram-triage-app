import type { Analysis, BreastResult } from '../domain/triage';

export const breast = (overrides: Partial<BreastResult> = {}): BreastResult => ({
  label: 'R',
  side: 'R',
  level: 'high_priority',
  scoringMode: 'fused',
  probabilities: { routine: 0.1, shortFollowUp: 0.1, biopsy: 0.8 },
  qualityIssues: [],
  views: [{
    panel: 1, side: 'R', view: 'MLO', probabilities: { routine: 0.1, shortFollowUp: 0.1, biopsy: 0.8 },
    qualityIssues: [], heatmap: { url: 'data:image/png;base64,AAAA', width: 400, height: 768 },
    heatmapUnavailableReason: null,
    regions: [{ x: 0.15, y: 0.75, width: 0.15, height: 0.125, score: 0.98, depth: 'middle', vertical: 'lower' }],
  }],
  ...overrides,
});

export const analysis = (overrides: Partial<Analysis> = {}): Analysis => ({
  overallLevel: 'high_priority',
  breasts: [breast()],
  rejectedPanels: [],
  maskedTextRegions: 2,
  modelVersion: '1.0.0',
  ...overrides,
});

/** Structured content exactly as the MCP server returns it. */
export const serverPayload = {
  overall_level: 'review',
  masked_text_regions: 1,
  model_version: '1.0.0',
  rejected_panels: [{ panel: 3, mammogram_confidence: 0.02 }],
  disclaimer: '...',
  breasts: [{
    label: 'L', side: 'L', level: 'review', scoring_mode: 'fused', suspicion: 0.05, attention: 0.2,
    most_likely: 'BI-RADS 1-2', probabilities: { birads_1_2: 0.6, birads_3: 0.3, birads_4_5: 0.1 },
    quality_issues: ['blurry'],
    views: [
      { panel: 1, side: 'L', view: 'CC', probabilities: { birads_1_2: 0.6, birads_3: 0.3, birads_4_5: 0.1 },
        quality_issues: ['blurry'], has_heatmap: true, heatmap_unavailable_reason: null,
        regions: [{ x: 0.5, y: 0.2, width: 0.15, height: 0.12, score: 0.7, depth: 'anterior', vertical: 'upper' }] },
      { panel: 2, side: 'L', view: 'MLO', probabilities: { birads_1_2: 0.6, birads_3: 0.3, birads_4_5: 0.1 },
        quality_issues: [], has_heatmap: false, heatmap_unavailable_reason: 'low_resolution: needs 1500 px' },
    ],
  }],
};

/** 1x1 PNG whose IHDR says 300 x 600. */
export function pngBase64(width = 300, height = 600): string {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return btoa(String.fromCharCode(...bytes));
}
