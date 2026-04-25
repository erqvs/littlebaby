export type ImageMetadata = {
  width: number;
  height: number;
};

export const IMAGE_REDUCE_QUALITY_STEPS = [85, 75, 65, 55, 45, 35] as const;
export const MAX_IMAGE_INPUT_PIXELS = 25_000_000;

export function buildImageResizeSideGrid(maxSide: number, sideStart: number): number[] {
  return [sideStart, 1800, 1600, 1400, 1200, 1000, 800]
    .map((value) => Math.min(maxSide, value))
    .filter((value, idx, arr) => value > 0 && arr.indexOf(value) === idx)
    .toSorted((a, b) => b - a);
}

function buildImageMetadata(width: number, height: number): ImageMetadata | null {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function readPngMetadata(buffer: Buffer): ImageMetadata | null {
  if (buffer.length < 24) {
    return null;
  }
  if (
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47 ||
    buffer.toString("ascii", 12, 16) !== "IHDR"
  ) {
    return null;
  }
  return buildImageMetadata(buffer.readUInt32BE(16), buffer.readUInt32BE(20));
}

function readGifMetadata(buffer: Buffer): ImageMetadata | null {
  if (buffer.length < 10) {
    return null;
  }
  const signature = buffer.toString("ascii", 0, 6);
  if (signature !== "GIF87a" && signature !== "GIF89a") {
    return null;
  }
  return buildImageMetadata(buffer.readUInt16LE(6), buffer.readUInt16LE(8));
}

export async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata | null> {
  return readPngMetadata(buffer) ?? readGifMetadata(buffer);
}

export async function resizeToJpeg(params: {
  buffer: Buffer;
  maxBytes?: number;
  maxDimensionPx?: number;
  quality?: number;
}): Promise<Buffer> {
  void params.maxBytes;
  void params.maxDimensionPx;
  void params.quality;
  return params.buffer;
}

export async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  return buffer;
}

export async function hasAlphaChannel(buffer: Buffer): Promise<boolean> {
  void buffer;
  return false;
}

export async function optimizeImageToPng(buffer: Buffer, maxBytes?: number): Promise<Buffer> {
  void maxBytes;
  return buffer;
}
