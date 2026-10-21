import { describe, expect, it } from 'vitest';
import { clampCrop, FULL_IMAGE, isFullImage, MIN_CROP_SIDE, moveCorner, moveEdge } from './crop';

const box = { x: 0.2, y: 0.1, width: 0.5, height: 0.6 };
const close = (actual: object, expected: object) => {
  for (const [key, value] of Object.entries(expected)) {
    expect((actual as Record<string, number>)[key]).toBeCloseTo(value as number, 6);
  }
};

describe('crop', () => {
  it('moves one edge and keeps the opposite one in place', () => {
    close(moveEdge(box, 'left', -0.1), { x: 0.1, width: 0.6 });
    close(moveEdge(box, 'right', 0.1), { x: 0.2, width: 0.6 });
    close(moveEdge(box, 'top', 0.05), { y: 0.15, height: 0.55 });
    close(moveEdge(box, 'bottom', -0.2), { y: 0.1, height: 0.4 });
  });

  it('stops edges at the image border', () => {
    close(moveEdge(box, 'left', -1), { x: 0, width: 0.7 });
    close(moveEdge(box, 'right', 1), { width: 0.8 });
    close(moveEdge(box, 'top', -1), { y: 0, height: 0.7 });
    close(moveEdge(box, 'bottom', 1), { height: 0.9 });
  });

  it('never makes a side smaller than the minimum', () => {
    expect(moveEdge(box, 'left', 1).width).toBeCloseTo(MIN_CROP_SIDE, 6);
    expect(moveEdge(box, 'top', 1).height).toBeCloseTo(MIN_CROP_SIDE, 6);
    expect(moveEdge(box, 'right', -1).width).toBeCloseTo(MIN_CROP_SIDE, 6);
    expect(moveEdge(box, 'bottom', -1).height).toBeCloseTo(MIN_CROP_SIDE, 6);
  });

  it('moves a corner as its two edges', () => {
    close(moveCorner(box, 'top-left', 0.1, 0.1), { x: 0.3, y: 0.2, width: 0.4, height: 0.5 });
    close(moveCorner(box, 'bottom-right', 0.1, 0.1), { x: 0.2, y: 0.1, width: 0.6, height: 0.7 });
  });

  it('clamps a box into the image', () => {
    close(clampCrop({ x: -0.2, y: 0.9, width: 1.5, height: 0.05 }), { x: 0, y: 0.9, width: 1, height: MIN_CROP_SIDE });
  });

  it('recognizes the whole image', () => {
    expect(isFullImage(FULL_IMAGE)).toBe(true);
    expect(isFullImage({ x: 0.002, y: 0, width: 0.997, height: 1 })).toBe(true);
    expect(isFullImage(box)).toBe(false);
  });
});

describe('clampCrop with invalid values', () => {
  it('treats a box with non-finite values as the whole image', () => {
    expect(clampCrop({ x: Number.NaN, y: 0, width: 0.5, height: 0.5 })).toEqual(FULL_IMAGE);
    expect(clampCrop({ x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 0.5 })).toEqual(FULL_IMAGE);
  });
});
