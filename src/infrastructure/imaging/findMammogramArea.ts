import { FULL_IMAGE, type CropBox } from '../../domain/crop';
import type { CropProposal } from '../../application/ports';

/** Luminance (0-255), row by row, of an image already reduced to about MAX_ANALYSIS_SIDE on its longer side. */
export interface GrayImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

/** The detection works on a reduced copy: enough to see a monitor frame, cheap on a phone. */
export const MAX_ANALYSIS_SIDE = 512;

// A frame line (row or column at the border of the photo) is mostly one flat gray: the monitor or the viewer around
// the mammogram. Its level is taken from the outermost frame line, and inner lines belong to the frame while they keep
// that level. Mammogram lines are either black (the background around the breast) or textured (tissue).
// Well above the black of a photographed screen (about 40-50 luminance: the monitor glows), so the mammogram's own
// background is never taken for frame, whatever the browser's downscaling.
const FRAME_MIN_LEVEL = 60;
const FRAME_MAX_LEVEL = 220;
const NEAR_LEVEL = 18;
const FRAME_UNIFORMITY = 0.7;
// The outermost frame line sets the level, so it must be clearly flat.
const REFERENCE_UNIFORMITY = 0.85;
// A monitor or viewer frame has no black in it, while a line through tissue crosses the black background around the
// breast: lines with more dark pixels than this are never frame, even if most of their pixels are one smooth gray.
const FRAME_MAX_DARK = 0.05;
const SAME_FRAME_LEVEL = 24;
// A dark, flat band outside the frame (the monitor's bezel) is skipped when a gray frame follows it.
const BEZEL_MAX_LEVEL = 45;
const BEZEL_MAX_FRACTION = 0.2;
// Icons, text or moiré can break a frame line or two; a frame continues across gaps this short.
const MAX_GAP_LINES = 3;
// A detected area smaller than this on any side is not trusted.
const MIN_AREA_SIDE = 0.25;
// Moves the crop slightly inside, past the blurred transition between frame and image.
const INSET = 0.005;
const MIN_TRIM = 0.01;

type Axis = 'rows' | 'columns';

interface Bounds { left: number; top: number; right: number; bottom: number }

interface LineProfile { level: number; uniformity: number; dark: number }

function profile(image: GrayImage, axis: Axis, index: number, from: number, to: number): LineProfile {
  const values: number[] = [];
  for (let i = from; i < to; i += 1) {
    values.push(axis === 'rows' ? image.data[index * image.width + i]! : image.data[i * image.width + index]!);
  }
  values.sort((a, b) => a - b);
  const level = values[Math.floor(values.length / 2)] ?? 0;
  const near = values.filter((v) => Math.abs(v - level) <= NEAR_LEVEL).length;
  const dark = values.filter((v) => v < BEZEL_MAX_LEVEL).length;
  const count = values.length || 1;
  return { level, uniformity: near / count, dark: dark / count };
}

const NOT_A_LINE: LineProfile = { level: 0, uniformity: 0, dark: 1 };
const isFlat = (p: LineProfile) => p.uniformity >= FRAME_UNIFORMITY;
const isFrame = (p: LineProfile) => isFlat(p) && p.dark <= FRAME_MAX_DARK && p.level >= FRAME_MIN_LEVEL
  && p.level <= FRAME_MAX_LEVEL;
const isBezel = (p: LineProfile) => isFlat(p) && p.level < BEZEL_MAX_LEVEL;

/**
 * How many lines, from one border inward, belong to the frame: an optional dark bezel, then gray lines of the same
 * level, tolerating short gaps. Zero when the border is not a gray frame.
 */
function frameDepth(lines: LineProfile[]): number {
  let start = 0;
  const maxBezel = Math.floor(lines.length * BEZEL_MAX_FRACTION);
  while (start < maxBezel && isBezel(lines[start]!) && !isFrame(lines[start]!)) start += 1;
  const first = lines[start] ?? NOT_A_LINE;
  if (!isFrame(first) || first.uniformity < REFERENCE_UNIFORMITY) return 0;
  const reference = first.level;
  let depth = start + 1;
  let gap = 0;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (isFrame(line) && Math.abs(line.level - reference) <= SAME_FRAME_LEVEL) {
      depth = i + 1;
      gap = 0;
    } else if (++gap > MAX_GAP_LINES) {
      break;
    }
  }
  return depth;
}

/** The bounds without the frame along one axis, or null when every line is frame (no mammogram to keep). */
function trim(image: GrayImage, bounds: Bounds, axis: Axis): Bounds | null {
  const [lo, hi, from, to] = axis === 'columns'
    ? [bounds.left, bounds.right, bounds.top, bounds.bottom]
    : [bounds.top, bounds.bottom, bounds.left, bounds.right];
  const lines: LineProfile[] = [];
  for (let i = lo; i < hi; i += 1) lines.push(profile(image, axis, i, from, to));
  const start = lo + frameDepth(lines);
  const end = hi - frameDepth([...lines].reverse());
  if (end - start < 1) return null;
  return axis === 'columns' ? { ...bounds, left: start, right: end } : { ...bounds, top: start, bottom: end };
}

/** How many flat dark lines (the monitor's bezel) there are from one border inward, up to BEZEL_MAX_FRACTION. */
function darkBand(image: GrayImage, axis: Axis, indexes: number[], from: number, to: number): number {
  const max = Math.floor(indexes.length * BEZEL_MAX_FRACTION);
  let depth = 0;
  while (depth < max && isBezel(profile(image, axis, indexes[depth]!, from, to))) depth += 1;
  return depth;
}

const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i);

/**
 * The bounds without the monitor's dark bezel, when the whole monitor is in the photo. A frame line crosses the bezel
 * at both ends, so the bezel must go first for the frame to be measured. A dark band counts as bezel only when a gray
 * frame line follows it: the black background of a mammogram without a frame is followed by tissue, so it stays.
 */
function withoutBezel(image: GrayImage): Bounds {
  const { width: w, height: h } = image;
  const left = darkBand(image, 'columns', range(0, w), 0, h);
  const right = darkBand(image, 'columns', range(0, w).reverse(), 0, h);
  const top = darkBand(image, 'rows', range(0, h), 0, w);
  const bottom = darkBand(image, 'rows', range(0, h).reverse(), 0, w);
  const span = { left, top, right: w - right, bottom: h - bottom };
  const framedAfter = (axis: Axis, index: number) => {
    const line = axis === 'columns'
      ? profile(image, axis, index, span.top, span.bottom)
      : profile(image, axis, index, span.left, span.right);
    return isFrame(line) && line.uniformity >= REFERENCE_UNIFORMITY;
  };
  return {
    left: left && framedAfter('columns', left) ? left : 0,
    right: right && framedAfter('columns', w - right - 1) ? w - right : w,
    top: top && framedAfter('rows', top) ? top : 0,
    bottom: bottom && framedAfter('rows', h - bottom - 1) ? h - bottom : h,
  };
}

/**
 * Finds the mammogram inside a photo of a screen: the rectangle left after removing the monitor's dark bezel and then
 * the flat gray frame (monitor, viewer background, icon bars) from each border. Columns and rows are trimmed in
 * turns, each pass looking only at what the other left, until nothing changes. All views shown side by side stay
 * inside one box.
 */
export function findMammogramArea(image: GrayImage): CropProposal {
  if (image.width < 8 || image.height < 8) return { box: FULL_IMAGE, source: 'uncertain' };
  let bounds: Bounds = withoutBezel(image);
  for (let pass = 0; pass < 4; pass += 1) {
    const columns = trim(image, bounds, 'columns');
    const next = columns && trim(image, columns, 'rows');
    if (!next) return { box: FULL_IMAGE, source: 'uncertain' };
    if (next.left === bounds.left && next.right === bounds.right && next.top === bounds.top
      && next.bottom === bounds.bottom) break;
    bounds = next;
  }
  const width = (bounds.right - bounds.left) / image.width;
  const height = (bounds.bottom - bounds.top) / image.height;
  if (width < MIN_AREA_SIDE || height < MIN_AREA_SIDE) return { box: FULL_IMAGE, source: 'uncertain' };
  if (1 - width < MIN_TRIM && 1 - height < MIN_TRIM) return { box: FULL_IMAGE, source: 'no_frame' };
  const box: CropBox = {
    x: bounds.left / image.width + (bounds.left > 0 ? INSET : 0),
    y: bounds.top / image.height + (bounds.top > 0 ? INSET : 0),
    width: 0,
    height: 0,
  };
  const right = bounds.right / image.width - (bounds.right < image.width ? INSET : 0);
  const bottom = bounds.bottom / image.height - (bounds.bottom < image.height ? INSET : 0);
  return { box: { ...box, width: right - box.x, height: bottom - box.y }, source: 'detected' };
}

/** Luminance of RGBA pixels (as a canvas returns them), with the Rec. 601 weights the server's grayscale uses. */
export function luminance(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): GrayImage {
  const data = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 1, p += 4) {
    data[i] = Math.round(0.299 * rgba[p]! + 0.587 * rgba[p + 1]! + 0.114 * rgba[p + 2]!);
  }
  return { width, height, data };
}
