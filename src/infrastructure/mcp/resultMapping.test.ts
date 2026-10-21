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
    expect(cc!.heatmapOverlay).toBeNull(); // an older server: one combined image, nothing to hide
    expect(mlo!.heatmap).toBeNull();
    expect(mlo!.heatmapUnavailableReason).toMatch(/^low_resolution/);
    expect(result.breasts[0]!.probabilities).toEqual({ routine: 0.6, shortFollowUp: 0.3, biopsy: 0.1 });
  });

  const twoViews = { ...serverPayload, heatmap_format: 'layers',
    breasts: [{ ...serverPayload.breasts[0]!, views: [serverPayload.breasts[0]!.views[0]!, { ...serverPayload.breasts[0]!.views[0]!, panel: 2 }] }] };
  const blocks = (...images: string[]) =>
    [{ type: 'text', text: '{}' }, ...images.map((data) => ({ type: 'image', data, mimeType: 'image/png' }))];

  it('pairs the breast and its red-area layer per view with heatmap layers', () => {
    const [left, leftRed, right, rightRed] = [pngBase64(300, 600), pngBase64(300, 600), pngBase64(200, 400), pngBase64(200, 400)];
    const [first, second] = toAnalysis({ structuredContent: twoViews, content: blocks(left, leftRed, right, rightRed) })
      .breasts[0]!.views;
    expect(first!.heatmap?.url).toContain(left);
    expect(first!.heatmapOverlay?.width).toBe(300);
    expect(second!.heatmap?.width).toBe(200);
    expect(second!.heatmapOverlay?.url).toContain(rightRed);
  });

  it('refuses a result whose images do not match its views instead of shifting them', () => {
    const png = pngBase64(300, 600);
    expect(() => toAnalysis({ structuredContent: twoViews, content: blocks(png, png, png) })).toThrow(TriageError);
    expect(() => toAnalysis({ structuredContent: serverPayload, content: blocks(png, png) })).toThrow(TriageError);
  });

  it('refuses a red layer whose size differs from its breast image', () => {
    const content = blocks(pngBase64(300, 600), pngBase64(301, 600), pngBase64(300, 600), pngBase64(300, 600));
    expect(() => toAnalysis({ structuredContent: twoViews, content })).toThrow(TriageError);
  });

  it('refuses an image block that is not a PNG', () => {
    const notPng = btoa('GIF89a'.padEnd(33, 'A'));
    expect(() => toAnalysis({ structuredContent: serverPayload, content: blocks(notPng) })).toThrow(TriageError);
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
