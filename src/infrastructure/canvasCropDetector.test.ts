import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanvasCropDetector } from './canvasCropDetector';

const close = vi.fn();
let reducedSize: [number, number] = [0, 0];

/** A reduced photo whose pixels are a flat gray frame around a black, textured panel. */
class FakeCanvas {
  constructor(readonly width: number, readonly height: number) { reducedSize = [width, height]; }
  getContext() {
    const { width, height } = this;
    return {
      imageSmoothingQuality: 'low',
      drawImage: () => undefined,
      getImageData: () => {
        const data = new Uint8ClampedArray(width * height * 4);
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const panel = x >= width * 0.15 && x < width * 0.85 && y >= height * 0.05 && y < height * 0.9;
            const value = panel ? ((x * 7 + y * 13) % 5 === 0 ? 200 : 8) : 128;
            data.fill(value, (y * width + x) * 4, (y * width + x) * 4 + 3);
          }
        }
        return { data };
      },
    };
  }
}

describe('CanvasCropDetector', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reduces the photo, finds the panel inside the frame and frees the bitmap', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1125, height: 2000, close })));
    vi.stubGlobal('OffscreenCanvas', FakeCanvas);
    const proposal = await new CanvasCropDetector().propose(new Blob(['photo']));
    expect(reducedSize).toEqual([288, 512]);
    expect(proposal.source).toBe('detected');
    expect(proposal.box.x).toBeCloseTo(0.15, 1);
    expect(proposal.box.y + proposal.box.height).toBeCloseTo(0.9, 1);
    expect(close).toHaveBeenCalled();
  });

  it('lets a decoding failure through, so the use case proposes the whole image', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new DOMException('bad image', 'InvalidStateError'); }));
    await expect(new CanvasCropDetector().propose(new Blob(['x']))).rejects.toThrow('bad image');
  });
});
