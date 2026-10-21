/**
 * Width and height read from the file header (JPEG, PNG, WebP, GIF, BMP) without decoding the image, so a small file
 * with huge dimensions (a decompression bomb, or a giant export) is refused before it can exhaust a phone's memory.
 */
export interface ImageDimensions { readonly width: number; readonly height: number }

/** Same budget as the server's decoder (60 MP); larger images are refused there anyway. */
export const MAX_DECODED_PIXELS = 60_000_000;

const HEADER_BYTES = 64;
const JPEG_MAX_SCAN_BYTES = 1_048_576;
const JPEG_MAX_SEGMENTS = 64;
const JPEG_FRAME_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const JPEG_START_OF_SCAN = 0xda;
/** A JPEG whose frame header is not found within the scan budget: treated as over budget, never as harmless. */
const UNREADABLE_JPEG: ImageDimensions = { width: Number.POSITIVE_INFINITY, height: Number.POSITIVE_INFINITY };

async function bytes(file: Blob, from: number, length: number): Promise<DataView> {
  return new DataView(await file.slice(from, from + length).arrayBuffer());
}

/** Follows the segment chain (metadata such as EXIF or ICC can be large) up to the frame header, reading lazily. */
async function jpeg(file: Blob): Promise<ImageDimensions> {
  let offset = 2;
  for (let segment = 0; segment < JPEG_MAX_SEGMENTS && offset < JPEG_MAX_SCAN_BYTES; segment += 1) {
    const head = await bytes(file, offset, 9);
    if (head.byteLength < 4 || head.getUint8(0) !== 0xff) return UNREADABLE_JPEG;
    const marker = head.getUint8(1);
    if (marker === 0xff) { offset += 1; continue; } // fill byte
    if (JPEG_FRAME_MARKERS.has(marker)) {
      return head.byteLength < 9 ? UNREADABLE_JPEG : { height: head.getUint16(5), width: head.getUint16(7) };
    }
    if (marker === JPEG_START_OF_SCAN) return UNREADABLE_JPEG;
    offset += 2 + head.getUint16(2);
  }
  return UNREADABLE_JPEG;
}

function webp(b: DataView): ImageDimensions | null {
  const chunk = String.fromCharCode(b.getUint8(12), b.getUint8(13), b.getUint8(14), b.getUint8(15));
  if (chunk === 'VP8X' && b.byteLength >= 30) {
    const width = 1 + (b.getUint8(24) | (b.getUint8(25) << 8) | (b.getUint8(26) << 16));
    const height = 1 + (b.getUint8(27) | (b.getUint8(28) << 8) | (b.getUint8(29) << 16));
    return { width, height };
  }
  if (chunk === 'VP8 ' && b.byteLength >= 30) {
    return { width: b.getUint16(26, true) & 0x3fff, height: b.getUint16(28, true) & 0x3fff };
  }
  if (chunk === 'VP8L' && b.byteLength >= 25) {
    const bits = b.getUint32(21, true);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  return null;
}

/** The dimensions in the header, or null for other formats (AVIF, HEIC...), which are left to the decoder. */
export async function readImageDimensions(file: Blob): Promise<ImageDimensions | null> {
  const b = await bytes(file, 0, HEADER_BYTES);
  if (b.byteLength >= 4 && b.getUint16(0) === 0xffd8) return jpeg(file);
  if (b.byteLength < 30) return null;
  if (b.getUint32(0) === 0x89504e47) return { width: b.getUint32(16), height: b.getUint32(20) };
  if (b.getUint32(0) === 0x52494646 && b.getUint32(8) === 0x57454250) return webp(b); // "RIFF" ... "WEBP"
  if (b.getUint32(0) === 0x47494638) return { width: b.getUint16(6, true), height: b.getUint16(8, true) }; // "GIF8"
  if (b.getUint16(0) === 0x424d) { // "BM"
    return { width: Math.abs(b.getInt32(18, true)), height: Math.abs(b.getInt32(22, true)) };
  }
  return null;
}

/** Whether the header declares more pixels than the decoding budget. */
export async function exceedsDecodingBudget(file: Blob): Promise<boolean> {
  const size = await readImageDimensions(file);
  return size !== null && size.width * size.height > MAX_DECODED_PIXELS;
}
