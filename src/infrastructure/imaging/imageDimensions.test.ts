import { describe, expect, it } from 'vitest';
import { exceedsDecodingBudget, readImageDimensions } from './imageDimensions';

function png(width: number, height: number): Blob {
  const bytes = new Uint8Array(64);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new Blob([bytes]);
}

/** SOI, an APP0 segment to skip, then a baseline frame header (SOF0). */
function jpeg(width: number, height: number): Blob {
  const bytes = new Uint8Array(64);
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  bytes.set([0xff, 0xc0, 0x00, 0x11, 0x08], 20);
  const view = new DataView(bytes.buffer);
  view.setUint16(25, height);
  view.setUint16(27, width);
  return new Blob([bytes]);
}

function webpVp8x(width: number, height: number): Blob {
  const bytes = new Uint8Array(64);
  bytes.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
  bytes.set([...'WEBPVP8X'].map((c) => c.charCodeAt(0)), 8);
  const w = width - 1;
  const h = height - 1;
  bytes.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff, h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 24);
  return new Blob([bytes]);
}

describe('readImageDimensions', () => {
  it.each([
    ['PNG', png(1125, 2000)],
    ['JPEG', jpeg(1125, 2000)],
    ['WebP (VP8X)', webpVp8x(1125, 2000)],
  ])('reads %s headers without decoding', async (_name, file) => {
    expect(await readImageDimensions(file)).toEqual({ width: 1125, height: 2000 });
  });

  it('reads GIF and BMP headers', async () => {
    const gif = new Uint8Array(40);
    gif.set([...'GIF89a'].map((c) => c.charCodeAt(0)));
    new DataView(gif.buffer).setUint16(6, 65_535, true);
    new DataView(gif.buffer).setUint16(8, 65_535, true);
    expect(await readImageDimensions(new Blob([gif]))).toEqual({ width: 65_535, height: 65_535 });
    const bmp = new Uint8Array(40);
    bmp.set([0x42, 0x4d]);
    new DataView(bmp.buffer).setInt32(18, 800, true);
    new DataView(bmp.buffer).setInt32(22, -600, true); // top-down bitmaps have a negative height
    expect(await readImageDimensions(new Blob([bmp]))).toEqual({ width: 800, height: 600 });
  });

  it('follows large metadata segments to the JPEG frame header', async () => {
    const exif = new Uint8Array(65_537);
    exif.set([0xff, 0xe1, 0xff, 0xff]); // a 64 KB EXIF segment...
    const icc = new Uint8Array(6_002);
    icc.set([0xff, 0xe2, 0x17, 0x70]); // ...followed by a 6 KB ICC segment
    const sof = new Uint8Array(20);
    sof.set([0xff, 0xc0, 0x00, 0x11, 0x08, 0xff, 0xff, 0xff, 0xff]);
    const file = new Blob([new Uint8Array([0xff, 0xd8]), exif, icc, sof]);
    expect(await readImageDimensions(file)).toEqual({ width: 65_535, height: 65_535 });
    expect(await exceedsDecodingBudget(file)).toBe(true);
  });

  it('treats a JPEG without a readable frame header as over budget', async () => {
    expect(await exceedsDecodingBudget(new Blob([new Uint8Array([0xff, 0xd8, 0x00, 0x00, 0, 0, 0, 0])]))).toBe(true);
  });

  it('returns null for other formats (left to the decoder)', async () => {
    expect(await readImageDimensions(new Blob(['RIFF....AVIF'.padEnd(40, '\0')]))).toBeNull();
    expect(await readImageDimensions(new Blob([new Uint8Array([0x00, 0x01])]))).toBeNull();
  });

  it('flags images above the decoding budget', async () => {
    expect(await exceedsDecodingBudget(png(15_000, 15_000))).toBe(true);
    expect(await exceedsDecodingBudget(jpeg(8000, 6000))).toBe(false); // a 48 MP phone photo is fine
    expect(await exceedsDecodingBudget(new Blob(['not an image'.padEnd(40)]))).toBe(false);
  });
});
