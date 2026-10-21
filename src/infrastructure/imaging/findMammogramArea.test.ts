import { describe, expect, it } from 'vitest';
import { findMammogramArea, luminance, type GrayImage } from './findMammogramArea';

const W = 300;
const H = 500;

/** Deterministic noise, so the synthetic "tissue" is the same on every run. */
function noise(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

interface Rect { x0: number; y0: number; x1: number; y1: number }

/**
 * A synthetic mammogram view: black background with a textured half-ellipse of tissue against the chest wall
 * (right edge of the rectangle), like a CC view.
 */
function drawView(data: Uint8Array, rect: Rect, random: () => number) {
  const cx = rect.x1;
  const cy = (rect.y0 + rect.y1) / 2;
  const rx = (rect.x1 - rect.x0) * 0.8;
  const ry = (rect.y1 - rect.y0) * 0.45;
  for (let y = rect.y0; y < rect.y1; y += 1) {
    for (let x = rect.x0; x < rect.x1; x += 1) {
      const inside = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
      data[y * W + x] = inside ? 70 + Math.round(random() * 170) : Math.round(random() * 12);
    }
  }
}

function image(fill: number, views: Rect[], extra?: (data: Uint8Array, random: () => number) => void): GrayImage {
  const data = new Uint8Array(W * H).fill(fill);
  const random = noise(7);
  for (const view of views) drawView(data, view, random);
  extra?.(data, random);
  return { width: W, height: H, data };
}

const PANEL: Rect = { x0: 36, y0: 10, x1: 258, y1: 470 }; // the viewer area inside a gray frame

function expectBox(actual: { x: number; y: number; width: number; height: number }, rect: Rect) {
  expect(actual.x).toBeCloseTo(rect.x0 / W, 1);
  expect(actual.y).toBeCloseTo(rect.y0 / H, 1);
  expect(actual.x + actual.width).toBeCloseTo(rect.x1 / W, 1);
  expect(actual.y + actual.height).toBeCloseTo(rect.y1 / H, 1);
  // The crop never keeps frame: it stays inside the viewer area.
  expect(actual.x).toBeGreaterThanOrEqual(rect.x0 / W);
  expect(actual.x + actual.width).toBeLessThanOrEqual(rect.x1 / W);
}

describe('findMammogramArea', () => {
  it('removes a gray monitor frame around the mammogram', () => {
    const result = findMammogramArea(image(130, [PANEL]));
    expect(result.source).toBe('detected');
    expectBox(result.box, PANEL);
  });

  it('removes an icon bar at the bottom of the frame', () => {
    const withIcons = image(130, [PANEL], (data) => {
      for (const iconX of [120, 150, 180]) {
        for (let y = 478; y < 492; y += 1) for (let x = iconX; x < iconX + 12; x += 1) data[y * W + x] = 240;
      }
    });
    const result = findMammogramArea(withIcons);
    expect(result.source).toBe('detected');
    expectBox(result.box, PANEL);
  });

  it('removes a dark bezel outside the gray frame', () => {
    const withBezel = image(130, [PANEL], (data) => {
      for (let y = 0; y < H; y += 1) for (let x = 0; x < 12; x += 1) data[y * W + x] = 15;
    });
    const result = findMammogramArea(withBezel);
    expect(result.source).toBe('detected');
    expect(result.box.x).toBeCloseTo(PANEL.x0 / W, 1);
  });

  it('keeps every view of a side-by-side study in one box', () => {
    const left: Rect = { x0: 20, y0: 20, x1: 145, y1: 480 };
    const right: Rect = { x0: 155, y0: 20, x1: 280, y1: 480 };
    const twoViews = image(130, [left, right], (data) => {
      for (let y = 20; y < 480; y += 1) for (let x = 145; x < 155; x += 1) data[y * W + x] = 5; // dark gap
    });
    const result = findMammogramArea(twoViews);
    expect(result.source).toBe('detected');
    expectBox(result.box, { x0: left.x0, y0: left.y0, x1: right.x1, y1: right.y1 });
  });

  it('proposes the whole image when there is no frame (a screenshot or an exported file)', () => {
    const clean = image(0, [{ x0: 0, y0: 0, x1: W, y1: H }]);
    expect(findMammogramArea(clean)).toEqual({ box: { x: 0, y: 0, width: 1, height: 1 }, source: 'no_frame' });
  });

  it('marks as uncertain an image with nothing to keep, or one too small', () => {
    expect(findMammogramArea(image(130, [])).source).toBe('uncertain');
    expect(findMammogramArea({ width: 4, height: 4, data: new Uint8Array(16) }).source).toBe('uncertain');
  });

  it('marks as uncertain a frame that would leave too small an area', () => {
    const tiny = image(130, [{ x0: 140, y0: 240, x1: 180, y1: 290 }]);
    expect(findMammogramArea(tiny)).toEqual({ box: { x: 0, y: 0, width: 1, height: 1 }, source: 'uncertain' });
  });

  it('computes luminance with the Rec. 601 weights', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 200, 200, 200, 255]);
    expect([...luminance(rgba, 2, 2).data]).toEqual([76, 150, 29, 200]);
  });
});

describe('findMammogramArea never cuts tissue from an image without a frame', () => {
  /** Smooth tissue (150 ± spread) touching the left edge, on a black background: no frame at all. */
  function smoothTissue(spread: number): GrayImage {
    const data = new Uint8Array(W * H);
    const random = noise(3);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const inside = (x / (W * 0.7)) ** 2 + ((y - H / 2) / (H * 0.42)) ** 2 <= 1;
        data[y * W + x] = inside ? 150 + Math.round((random() * 2 - 1) * spread) : Math.round(random() * 10);
      }
    }
    return { width: W, height: H, data };
  }

  it.each([10, 15, 20])('keeps smooth tissue (±%i) against the chest wall whole', (spread) => {
    expect(findMammogramArea(smoothTissue(spread))).toEqual({ box: { x: 0, y: 0, width: 1, height: 1 }, source: 'no_frame' });
  });

  it('removes a frame present on only some sides', () => {
    const leftAndBottom = image(0, [{ x0: 0, y0: 0, x1: W, y1: H }], (data) => {
      for (let y = 0; y < H; y += 1) for (let x = 0; x < 30; x += 1) data[y * W + x] = 130;
      for (let y = 460; y < H; y += 1) for (let x = 0; x < W; x += 1) data[y * W + x] = 130;
    });
    const result = findMammogramArea(leftAndBottom);
    expect(result.source).toBe('detected');
    expect(result.box.x).toBeCloseTo(30 / W, 1);
    expect(result.box.y).toBe(0);
    expect(result.box.x + result.box.width).toBe(1);
    expect(result.box.y + result.box.height).toBeCloseTo(460 / H, 1);
  });
});

describe('findMammogramArea with the whole monitor in the photo', () => {
  // The viewer area sits inside the gray frame, which sits inside the bezel: frame on all four sides.
  const INNER: Rect = { x0: 45, y0: 60, x1: 255, y1: 440 };

  it.each([0.03, 0.05, 0.08])('removes a dark bezel (%s of each side) on all four sides, then the frame', (fraction) => {
    const bx = Math.round(W * fraction);
    const by = Math.round(H * fraction);
    const withBezel = image(130, [INNER], (data) => {
      for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) if (x < bx || x >= W - bx || y < by || y >= H - by) data[y * W + x] = 15;
      }
    });
    const result = findMammogramArea(withBezel);
    expect(result.source).toBe('detected');
    expectBox(result.box, INNER);
  });
});
