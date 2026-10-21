import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserImagePreparer } from './browserImagePreparer';

const draws: unknown[][] = [];
const canvasSizes: [number, number][] = [];

class FakeCanvas {
  constructor(readonly width: number, readonly height: number) { canvasSizes.push([width, height]); }
  getContext() { return { drawImage: (...args: unknown[]) => { draws.push(args); } }; }
  async convertToBlob() { return new Blob(['jpeg'], { type: 'image/jpeg' }); }
}

function stubImage(width: number, height: number) {
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width, height, close: () => undefined })));
  vi.stubGlobal('OffscreenCanvas', FakeCanvas);
}

const photo = new Blob(['photo'], { type: 'image/jpeg' });

describe('BrowserImagePreparer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    draws.length = 0;
    canvasSizes.length = 0;
  });

  it('sends an accepted file untouched when there is no crop', async () => {
    stubImage(1000, 2000);
    const prepared = await new BrowserImagePreparer().prepare(photo, 10_000_000);
    expect(atob(prepared.base64)).toBe('photo');
    expect(draws).toHaveLength(0);
  });

  it('crops at full resolution, keeping the height the patch model needs', async () => {
    stubImage(1125, 2000);
    await new BrowserImagePreparer().prepare(photo, 10_000_000, { x: 0.12, y: 0.02, width: 0.75, height: 0.92 });
    const [, sx, sy, sw, sh, , , dw, dh] = draws[0]!;
    expect([sx, sy, sw, sh]).toEqual([135, 40, 844, 1840]);
    expect([dw, dh]).toEqual([844, 1840]);
  });

  it('scales a large crop down to the maximum side after cropping', async () => {
    stubImage(6000, 8000);
    await new BrowserImagePreparer().prepare(photo, 10_000_000, { x: 0, y: 0, width: 0.5, height: 1 });
    expect(canvasSizes[0]).toEqual([1536, 4096]);
  });
});

describe('BrowserImagePreparer with an image too large to open', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('refuses it from the header, before decoding', async () => {
    const decode = vi.fn();
    vi.stubGlobal('createImageBitmap', decode);
    const header = new Uint8Array(64);
    header.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    new DataView(header.buffer).setUint32(16, 15_000);
    new DataView(header.buffer).setUint32(20, 15_000);
    const huge = new Blob([header], { type: 'image/png' });
    await expect(new BrowserImagePreparer().prepare(huge, 10_000_000, { x: 0.1, y: 0.1, width: 0.5, height: 0.5 }))
      .rejects.toMatchObject({ kind: 'too_many_pixels' });
    expect(decode).not.toHaveBeenCalled();
  });
});
