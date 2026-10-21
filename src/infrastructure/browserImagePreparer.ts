import { FULL_IMAGE, type CropBox } from '../domain/crop';
import { TriageError } from '../application/errors';
import type { ImagePreparer, PreparedImage } from '../application/ports';
import { exceedsDecodingBudget } from './imaging/imageDimensions';

/** Formats the server decodes directly; anything else (HEIC, AVIF, GIF...) is re-encoded. */
const PASS_THROUGH = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/tiff']);
/** Keeps enough height for the 2048 px patch model while bounding memory on phones. */
const MAX_SIDE_PX = 4096;

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

/**
 * Decodes with EXIF orientation applied (as the preview shows it), keeps the crop at full resolution and only then
 * scales down to MAX_SIDE_PX, so a cropped photo keeps as much height as possible for the patch model.
 */
async function reencode(file: Blob, maxBytes: number, crop: CropBox): Promise<Blob> {
  if (await exceedsDecodingBudget(file)) throw new TriageError('too_many_pixels');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (cause) {
    throw new TriageError('unreadable_image', { cause });
  }
  let canvas: OffscreenCanvas;
  try {
    const sx = Math.round(crop.x * bitmap.width);
    const sy = Math.round(crop.y * bitmap.height);
    const sw = Math.max(1, Math.min(bitmap.width - sx, Math.round(crop.width * bitmap.width)));
    const sh = Math.max(1, Math.min(bitmap.height - sy, Math.round(crop.height * bitmap.height)));
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(sw, sh));
    canvas = new OffscreenCanvas(Math.max(1, Math.round(sw * scale)), Math.max(1, Math.round(sh * scale)));
    const context = canvas.getContext('2d');
    if (!context) throw new TriageError('unexpected');
    context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  } finally {
    bitmap.close(); // the full-resolution bitmap is the large allocation: free it on every path
  }
  for (const quality of [0.95, 0.9, 0.8]) {
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    if (blob.size <= maxBytes) return blob;
  }
  throw new TriageError('too_large');
}

/**
 * Prepares the picked photo in memory only: no copy is written to storage, caches or IndexedDB.
 * Without a crop, files the server accepts are sent untouched (it applies EXIF orientation); others are re-encoded
 * as JPEG. With a crop, only that part is re-encoded and sent.
 */
export class BrowserImagePreparer implements ImagePreparer {
  async prepare(file: Blob, maxBytes: number, crop?: CropBox, signal?: AbortSignal): Promise<PreparedImage> {
    const untouched = !crop && PASS_THROUGH.has(file.type) && file.size <= maxBytes;
    const ready = untouched ? file : await reencode(file, maxBytes, crop ?? FULL_IMAGE);
    signal?.throwIfAborted();
    return { base64: await toBase64(ready) };
  }
}
