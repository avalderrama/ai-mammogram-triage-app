import { TriageError } from '../application/errors';
import type { ImagePreparer, PreparedImage } from '../application/ports';

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

async function reencode(file: Blob, maxBytes: number): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (cause) {
    throw new TriageError('unreadable_image', { cause });
  }
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new TriageError('unexpected');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.95, 0.9, 0.8]) {
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    if (blob.size <= maxBytes) return blob;
  }
  throw new TriageError('too_large');
}

/**
 * Prepares the picked photo in memory only: no copy is written to storage, caches or IndexedDB.
 * Files the server accepts are sent untouched (it applies EXIF orientation); others are re-encoded as JPEG.
 */
export class BrowserImagePreparer implements ImagePreparer {
  async prepare(file: Blob, maxBytes: number, signal?: AbortSignal): Promise<PreparedImage> {
    const ready = PASS_THROUGH.has(file.type) && file.size <= maxBytes ? file : await reencode(file, maxBytes);
    signal?.throwIfAborted();
    return { base64: await toBase64(ready) };
  }
}
