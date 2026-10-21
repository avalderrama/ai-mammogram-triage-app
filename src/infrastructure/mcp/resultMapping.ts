import { z } from 'zod';
import type { Analysis, BiradsProbabilities, HeatmapImage, RejectedPanel, ViewResult } from '../../domain/triage';
import { TriageError, type FailureKind } from '../../application/errors';

const level = z.enum(['high_priority', 'review', 'no_suspicious_findings']);
const side = z.enum(['R', 'L', 'unknown']);
const view = z.enum(['CC', 'MLO', 'unknown']);
const quality = z.array(z.enum(['low_resolution', 'blurry', 'glare', 'small_breast']));
const probability = z.number().min(0).max(1);
const probabilities = z.object({ birads_1_2: probability, birads_3: probability, birads_4_5: probability });
const unit = z.number().min(0).max(1);
const region = z.object({
  x: unit, y: unit, width: unit, height: unit, score: unit,
  depth: z.enum(['posterior', 'middle', 'anterior']),
  vertical: z.enum(['upper', 'middle', 'lower']),
});
const rejected = z.object({ panel: z.number().int(), mammogram_confidence: probability });

const analysisSchema = z.object({
  overall_level: level,
  masked_text_regions: z.number().int().min(0),
  model_version: z.string(),
  rejected_panels: z.array(rejected),
  // Older servers send one combined image per view and don't say so.
  heatmap_format: z.enum(['combined', 'layers']).default('combined'),
  breasts: z.array(z.object({
    label: z.string(),
    side,
    level,
    scoring_mode: z.enum(['fused', 'global_only']),
    probabilities,
    quality_issues: quality,
    views: z.array(z.object({
      panel: z.number().int(),
      side,
      view,
      probabilities,
      quality_issues: quality,
      has_heatmap: z.boolean(),
      heatmap_unavailable_reason: z.string().nullable(),
      // Older servers don't send regions.
      regions: z.array(region).default([]),
    })),
  })).min(1),
});

const errorSchema = z.object({
  error: z.string(),
  details: z.object({ panels: z.array(rejected).optional() }).nullable().optional(),
});

interface ContentBlock { type: string; data?: unknown; mimeType?: unknown }
export interface ToolResultLike { isError?: boolean; structuredContent?: unknown; content?: unknown }

const SERVER_ERRORS: Record<string, FailureKind> = {
  not_a_mammogram: 'not_a_mammogram',
  unreadable_image: 'unreadable_image',
  unsupported_media_type: 'unreadable_image',
  image_too_large: 'too_large',
  invalid_input: 'invalid_input',
  server_busy: 'server_busy',
  internal_error: 'unexpected',
};

const toProbabilities = (p: z.infer<typeof probabilities>): BiradsProbabilities =>
  ({ routine: p.birads_1_2, shortFollowUp: p.birads_3, biopsy: p.birads_4_5 });

const toRejected = (r: z.infer<typeof rejected>): RejectedPanel =>
  ({ panel: r.panel, mammogramConfidence: r.mammogram_confidence });

const PNG_SIGNATURE = String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

/** Reads width and height from the PNG header (IHDR) so the page can reserve the space. */
function toHeatmap(base64: string): HeatmapImage {
  const header = atob(base64.slice(0, 32));
  if (!header.startsWith(PNG_SIGNATURE) || header.slice(12, 16) !== 'IHDR') {
    throw new TriageError('unexpected', { cause: new Error('A heatmap block is not a PNG image.') });
  }
  const read = (offset: number) =>
    ((header.charCodeAt(offset) << 24) | (header.charCodeAt(offset + 1) << 16)
      | (header.charCodeAt(offset + 2) << 8) | header.charCodeAt(offset + 3)) >>> 0;
  return { url: `data:image/png;base64,${base64}`, width: read(16), height: read(20) };
}

/**
 * Maps the `mammo_analyze_mammogram` result to the domain model. Heatmaps arrive as image content blocks
 * in the same order as the views flagged `has_heatmap`: one per view, or two with heatmap layers (the breast, then
 * the red areas). They are kept only as in-memory data URLs.
 */
export function toAnalysis(result: ToolResultLike): Analysis {
  if (result.isError) {
    const parsed = errorSchema.safeParse(result.structuredContent);
    // Errors without a code (e.g. argument validation by the SDK) are not the user's fault: retryable.
    const kind = parsed.success ? SERVER_ERRORS[parsed.data.error] ?? 'unexpected' : 'unexpected';
    const panels = parsed.success ? parsed.data.details?.panels?.map(toRejected) : undefined;
    throw new TriageError(kind, { rejectedPanels: panels });
  }
  const parsed = analysisSchema.safeParse(result.structuredContent);
  if (!parsed.success) throw new TriageError('unexpected', { cause: parsed.error });

  const images = (Array.isArray(result.content) ? result.content as ContentBlock[] : [])
    .filter((c) => c.type === 'image' && typeof c.data === 'string' && c.mimeType === 'image/png')
    .map((c) => toHeatmap(c.data as string));
  let next = 0;
  const a = parsed.data;
  const layers = a.heatmap_format === 'layers';
  // Images are paired with views by position: a count that does not match would put one view's image under
  // another's label, so the whole result is refused instead.
  const withHeatmap = a.breasts.flatMap((b) => b.views).filter((v) => v.has_heatmap).length;
  if (images.length !== withHeatmap * (layers ? 2 : 1)) {
    throw new TriageError('unexpected', { cause: new Error('The heatmap images do not match the views.') });
  }
  const takeView = (): Pick<ViewResult, 'heatmap' | 'heatmapOverlay'> => {
    const heatmap = images[next++]!;
    const overlay = layers ? images[next++]! : null;
    // A red layer that does not fit its breast image cannot be shown, and dropping it would label the clean image
    // as the heatmap, which reads as "nothing suspicious": refused like a count mismatch.
    if (overlay && (overlay.width !== heatmap.width || overlay.height !== heatmap.height)) {
      throw new TriageError('unexpected', { cause: new Error('A heatmap layer does not match its image.') });
    }
    return { heatmap, heatmapOverlay: overlay };
  };
  return {
    overallLevel: a.overall_level,
    maskedTextRegions: a.masked_text_regions,
    modelVersion: a.model_version,
    rejectedPanels: a.rejected_panels.map(toRejected),
    breasts: a.breasts.map((b) => ({
      label: b.label,
      side: b.side,
      level: b.level,
      scoringMode: b.scoring_mode,
      probabilities: toProbabilities(b.probabilities),
      qualityIssues: b.quality_issues,
      views: b.views.map((v) => ({
        panel: v.panel,
        side: v.side,
        view: v.view,
        probabilities: toProbabilities(v.probabilities),
        qualityIssues: v.quality_issues,
        ...(v.has_heatmap ? takeView() : { heatmap: null, heatmapOverlay: null }),
        heatmapUnavailableReason: v.heatmap_unavailable_reason,
        regions: v.regions,
      })),
    })),
  };
}
