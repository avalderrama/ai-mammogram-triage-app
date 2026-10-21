/**
 * The part of the picked image that is analyzed, normalized to the image's width and height (0-1) after EXIF
 * orientation, so it does not depend on the size the preview is drawn at.
 */
export interface CropBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type CropEdge = 'top' | 'right' | 'bottom' | 'left';
export type CropCorner = 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';

export const FULL_IMAGE: CropBox = { x: 0, y: 0, width: 1, height: 1 };

/** Smallest side a crop can have, so a slip of the finger cannot leave an empty or useless area. */
export const MIN_CROP_SIDE = 0.1;

const CORNER_EDGES: Record<CropCorner, readonly [CropEdge, CropEdge]> = {
  'top-left': ['top', 'left'],
  'top-right': ['top', 'right'],
  'bottom-right': ['bottom', 'right'],
  'bottom-left': ['bottom', 'left'],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Keeps the box inside the image and at least MIN_CROP_SIDE on each side. A box with non-finite values is the whole
 * image, so a bad caller can never produce an empty or NaN crop. */
export function clampCrop(box: CropBox): CropBox {
  if (![box.x, box.y, box.width, box.height].every(Number.isFinite)) return FULL_IMAGE;
  const width = clamp(box.width, MIN_CROP_SIDE, 1);
  const height = clamp(box.height, MIN_CROP_SIDE, 1);
  return { x: clamp(box.x, 0, 1 - width), y: clamp(box.y, 0, 1 - height), width, height };
}

/**
 * Moves one edge by `delta` (a fraction of the image; positive is right or down) while the opposite edge stays put.
 * The edge stops at the image border and MIN_CROP_SIDE away from the opposite edge.
 */
export function moveEdge(box: CropBox, edge: CropEdge, delta: number): CropBox {
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  switch (edge) {
    case 'left': {
      const x = clamp(box.x + delta, 0, right - MIN_CROP_SIDE);
      return { ...box, x, width: right - x };
    }
    case 'right':
      return { ...box, width: clamp(right + delta, box.x + MIN_CROP_SIDE, 1) - box.x };
    case 'top': {
      const y = clamp(box.y + delta, 0, bottom - MIN_CROP_SIDE);
      return { ...box, y, height: bottom - y };
    }
    case 'bottom':
      return { ...box, height: clamp(bottom + delta, box.y + MIN_CROP_SIDE, 1) - box.y };
  }
}

/** Moves a corner, that is, its two edges, by (dx, dy). */
export function moveCorner(box: CropBox, corner: CropCorner, dx: number, dy: number): CropBox {
  const [vertical, horizontal] = CORNER_EDGES[corner];
  return moveEdge(moveEdge(box, horizontal, dx), vertical, dy);
}

/** Whether the box covers the whole image, up to `tolerance` on each edge. */
export function isFullImage(box: CropBox, tolerance = 0.005): boolean {
  return box.x <= tolerance && box.y <= tolerance && box.x + box.width >= 1 - tolerance
    && box.y + box.height >= 1 - tolerance;
}
