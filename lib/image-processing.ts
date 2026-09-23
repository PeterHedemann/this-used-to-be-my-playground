import sharp from "sharp";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_BODY_BYTES = MAX_IMAGE_BYTES + 64 * 1024;

export class ImageRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Enforce limits while reading, even when Content-Length is absent or incorrect.
export async function readLimitedBody(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
  status = 413,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!body) throw new ImageRequestError("The image is empty.", status);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ImageRequestError("The image exceeds the 10 MiB size limit.", status);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export async function validateImage(bytes: Uint8Array, output = false) {
  const status = output ? 502 : 400;
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    const allowed = output ? ["png"] : ["png", "jpeg", "webp"];
    if (!allowed.includes(metadata.format ?? "") || (metadata.pages ?? 1) !== 1) {
      throw new Error("Unsupported image format");
    }
    // Decode pixels to reject truncated/corrupt files, not just spoofed headers.
    await image.stats();
    return metadata;
  } catch {
    throw new ImageRequestError(
      output
        ? "The resize service returned an invalid image. Please try again."
        : "Choose a valid, non-animated PNG, JPEG, or WebP image under 40 megapixels.",
      status,
    );
  }
}

export function safeFilename(value: string | null): string {
  const name = (value ?? "result.png").split(/[\\/]/).pop() ?? "result.png";
  const stem = name.replace(/\.png$/i, "").replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 150);
  return `${stem || "result"}.png`;
}
