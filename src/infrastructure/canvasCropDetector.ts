import type { CropDetector, CropProposal } from '../application/ports';
import { TriageError } from '../application/errors';
import { findMammogramArea, luminance, MAX_ANALYSIS_SIDE } from './imaging/findMammogramArea';
import { exceedsDecodingBudget } from './imaging/imageDimensions';

/**
 * Finds the mammogram in the picked photo on a reduced copy drawn in an offscreen canvas, with EXIF orientation
 * applied so the box matches the preview. Nothing leaves the device and nothing is stored.
 */
export class CanvasCropDetector implements CropDetector {
  async propose(file: Blob, signal?: AbortSignal): Promise<CropProposal> {
    // An image too large to decode safely is never decoded, not even for the preview: the review screen says so.
    if (await exceedsDecodingBudget(file)) throw new TriageError('too_many_pixels');
    signal?.throwIfAborted();
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    try {
      signal?.throwIfAborted();
      const scale = Math.min(1, MAX_ANALYSIS_SIDE / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('2D canvas is not available');
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, width, height);
      return findMammogramArea(luminance(context.getImageData(0, 0, width, height).data, width, height));
    } finally {
      bitmap.close();
    }
  }
}
