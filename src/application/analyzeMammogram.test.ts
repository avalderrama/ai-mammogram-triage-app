import { describe, expect, it, vi } from 'vitest';
import { analysis } from '../test/fixtures';
import { createAnalyzeMammogram } from './analyzeMammogram';
import { TriageError } from './errors';
import type { ImagePreparer, SettingsRepository, TriageGateway } from './ports';

const configured: SettingsRepository = {
  load: () => ({ serverUrl: 'https://x.example/mcp', accessKey: 'k'.repeat(32), rememberKey: false }),
  save: () => undefined,
};
const preparer: ImagePreparer = { prepare: async () => ({ base64: 'AAAA' }) };
const image = new Blob(['x'], { type: 'image/png' });

function setup(gateway: Partial<TriageGateway> = {}, settings = configured) {
  const full: TriageGateway = { analyze: async () => analysis(), testConnection: async () => undefined, ...gateway };
  return createAnalyzeMammogram({ gateway: full, preparer, settings, maxImageBytes: 1000, newCorrelationId: () => 'ABC12345' });
}

describe('analyzeMammogram', () => {
  it('prepares the image, reports steps and returns the analysis', async () => {
    const analyze = vi.fn(async () => analysis());
    const steps: string[] = [];
    const outcome = await setup({ analyze })({ file: image, panelCount: 2 }, (s) => steps.push(s));
    expect(outcome.ok).toBe(true);
    expect(steps).toEqual(['preparing', 'analyzing']);
    expect(analyze).toHaveBeenCalledWith(expect.objectContaining({ panelCount: 2, image: expect.objectContaining({ base64: 'AAAA' }) }),
      expect.objectContaining({ serverUrl: 'https://x.example/mcp' }), undefined);
  });

  it('fails as not_configured without calling the server', async () => {
    const analyze = vi.fn();
    const outcome = await setup({ analyze }, { load: () => ({ serverUrl: '', accessKey: '', rememberKey: false }), save: () => {} })({ file: image });
    expect(outcome).toEqual({ ok: false, failure: expect.objectContaining({ kind: 'not_configured', retryable: false }) });
    expect(analyze).not.toHaveBeenCalled();
  });

  it('analyzes without an access key when the server address is set (Cloudflare Access session)', async () => {
    const analyze = vi.fn(async () => analysis());
    const outcome = await setup({ analyze }, {
      load: () => ({ serverUrl: 'https://app.example/mcp', accessKey: '', rememberKey: false }), save: () => {},
    })({ file: image });
    expect(outcome.ok).toBe(true);
    expect(analyze).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ accessKey: '' }), undefined);
  });

  it('rejects non-image files', async () => {
    const outcome = await setup()({ file: new Blob(['%PDF'], { type: 'application/pdf' }) });
    expect(!outcome.ok && outcome.failure.kind).toBe('not_an_image');
  });

  it('passes a 2 x 2 grid on, and refuses a grid that is not 4 views', async () => {
    const analyze = vi.fn(async () => analysis());
    await setup({ analyze })({ file: image, panelCount: 4, grid: true });
    expect(analyze).toHaveBeenCalledWith(expect.objectContaining({ panelCount: 4, grid: true }), expect.anything(), undefined);
    const outcome = await setup()({ file: image, panelCount: 2, grid: true });
    expect(!outcome.ok && outcome.failure.kind).toBe('invalid_input');
  });

  it('rejects a layout that does not match the panel count', async () => {
    const outcome = await setup()({ file: image, panelCount: 2, layout: { sides: ['R'], views: ['CC'] } });
    expect(!outcome.ok && outcome.failure.kind).toBe('invalid_input');
  });

  it('maps gateway errors to failures with a correlation id', async () => {
    const outcome = await setup({ analyze: async () => { throw new TriageError('rate_limited', { retryAfterSeconds: 12 }); } })({ file: image });
    expect(outcome).toEqual({ ok: false, failure: { kind: 'rate_limited', correlationId: 'ABC12345', retryAfterSeconds: 12, rejectedPanels: undefined, retryable: true } });
  });

  it('turns unknown errors into a retryable unexpected failure', async () => {
    const outcome = await setup({ analyze: async () => { throw new Error('boom'); } })({ file: image });
    expect(!outcome.ok && outcome.failure).toMatchObject({ kind: 'unexpected', retryable: true });
  });

  it('reports cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    const outcome = await setup()({ file: image }, undefined, controller.signal);
    expect(!outcome.ok && outcome.failure.kind).toBe('cancelled');
  });
});

describe('analyzeMammogram crop', () => {
  it('passes the crop to the preparer, and no crop when it covers the whole image', async () => {
    const prepare = vi.fn(async () => ({ base64: 'AAAA' }));
    const run = (crop?: { x: number; y: number; width: number; height: number }) =>
      createAnalyzeMammogram({ gateway: { analyze: async () => analysis(), testConnection: async () => undefined },
        preparer: { prepare }, settings: configured, maxImageBytes: 1000, newCorrelationId: () => 'ABC12345' })(
        { file: image, crop });
    await run({ x: 0.1, y: 0.05, width: 0.7, height: 0.9 });
    await run({ x: 0, y: 0, width: 1, height: 1 });
    await run();
    expect(prepare.mock.calls.map((c) => (c as unknown[])[2])).toEqual(
      [{ x: 0.1, y: 0.05, width: 0.7, height: 0.9 }, undefined, undefined]);
  });
});
