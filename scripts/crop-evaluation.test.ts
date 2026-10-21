/**
 * Runs the automatic crop on real photos of screens (opt-in: set CROP_PHOTOS_DIR; skipped otherwise, e.g. in CI).
 * The folder must hold JPEG photos already turned upright (scripts/crop_gate_check.py prepare does it). Writes
 * crops.json there, with the proposed box of each photo, for scripts/crop_gate_check.py check. See
 * docs/crop-evaluation.md. Photos of mammograms never go into the repository.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import jpeg from 'jpeg-js';
import { describe, expect, it } from 'vitest';
import { findMammogramArea, luminance, MAX_ANALYSIS_SIDE, type GrayImage } from '../src/infrastructure/imaging/findMammogramArea';

const folder = process.env.CROP_PHOTOS_DIR;

/** Area-average reduction to MAX_ANALYSIS_SIDE, close to what the browser canvas does in production. */
function reduce(image: GrayImage): GrayImage {
  const scale = Math.min(1, MAX_ANALYSIS_SIDE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.floor(y / scale);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) / scale));
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.floor(x / scale);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) / scale));
      let sum = 0;
      for (let yy = y0; yy < y1; yy += 1) for (let xx = x0; xx < x1; xx += 1) sum += image.data[yy * image.width + xx]!;
      data[y * width + x] = Math.round(sum / ((y1 - y0) * (x1 - x0)));
    }
  }
  return { width, height, data };
}

describe.skipIf(!folder)('crop evaluation on real photos', () => {
  it('proposes a crop for every photo and writes crops.json', { timeout: 600_000 }, () => {
    const files = readdirSync(folder!).filter((f) => /\.jpe?g$/i.test(f)).sort();
    const results: Record<string, unknown> = {};
    for (const file of files) {
      const decoded = jpeg.decode(readFileSync(join(folder!, file)), { useTArray: true, maxMemoryUsageInMB: 1024 });
      const proposal = findMammogramArea(reduce(luminance(decoded.data, decoded.width, decoded.height)));
      results[file] = proposal;
    }
    writeFileSync(join(folder!, 'crops.json'), JSON.stringify(results, null, 2));
    expect(files.length).toBeGreaterThan(0);
  });
});
