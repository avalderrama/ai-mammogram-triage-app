import { describe, expect, it } from 'vitest';
import { TriageError } from '../../application/errors';
import { pngBase64, serverPayload } from '../../test/fixtures';
import { toAnalysis } from './resultMapping';

describe('toAnalysis', () => {
  it('maps the structured content and attaches heatmaps in view order with their size', () => {
    const png = pngBase64(300, 600);
    const result = toAnalysis({
      structuredContent: serverPayload,
      content: [{ type: 'text', text: '{}' }, { type: 'image', data: png, mimeType: 'image/png' }],
    });
    expect(result.overallLevel).toBe('review');
    expect(result.rejectedPanels).toEqual([{ panel: 3, mammogramConfidence: 0.02 }]);
    const [cc, mlo] = result.breasts[0]!.views;
    expect(cc!.heatmap).toEqual({ url: `data:image/png;base64,${png}`, width: 300, height: 600 });
    expect(mlo!.heatmap).toBeNull();
    expect(mlo!.heatmapUnavailableReason).toMatch(/^low_resolution/);
    expect(result.breasts[0]!.probabilities).toEqual({ routine: 0.6, shortFollowUp: 0.3, biopsy: 0.1 });
  });

  it('throws not_a_mammogram with the rejected panels', () => {
    const run = () => toAnalysis({ isError: true, structuredContent: {
      error: 'not_a_mammogram', message: 'x', details: { panels: [{ panel: 1, mammogram_confidence: 0.01 }] } } });
    expect(run).toThrow(TriageError);
    try { run(); } catch (e) {
      expect((e as TriageError).kind).toBe('not_a_mammogram');
      expect((e as TriageError).rejectedPanels).toEqual([{ panel: 1, mammogramConfidence: 0.01 }]);
    }
  });

  it('treats tool errors without a code as unexpected (retryable), not as a user mistake', () => {
    expect(() => toAnalysis({ isError: true, content: [{ type: 'text', text: 'validation error' }] }))
      .toThrow(expect.objectContaining({ kind: 'unexpected' }));
  });

  it.each([['server_busy', 'server_busy'], ['internal_error', 'unexpected'], ['image_too_large', 'too_large'],
    ['unsupported_media_type', 'unreadable_image']])('maps server code %s to %s', (code, kind) => {
    expect(() => toAnalysis({ isError: true, structuredContent: { error: code, message: 'x', details: null } }))
      .toThrow(expect.objectContaining({ kind }));
  });

  it('rejects payloads that do not match the contract', () => {
    expect(() => toAnalysis({ structuredContent: { ...serverPayload, overall_level: 'maybe' } }))
      .toThrow(expect.objectContaining({ kind: 'unexpected' }));
  });
});
