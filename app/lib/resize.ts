"use client";

/**
 * Shrink a phone photo in the browser before it is uploaded.
 *
 * A modern phone camera writes 3 to 8 MB per photo, and Vercel caps a
 * request body at about 4.5 MB, so some resize is forced on us.
 *
 * The size we picked is a cost decision, not a model limit. Claude charges
 * an image in 28x28 patches, so a picture costs
 * ceil(width / 28) * ceil(height / 28) tokens. The models this app uses
 * accept up to 2576 px on the long edge and 4784 image tokens. We send
 * 1568 px instead:
 *
 *   1568 x 1176  ->  56 x 42  =  2352 tokens
 *   2576 x 1932  ->  capped at 4784 tokens
 *   1092 x  819  ->  39 x 30  =  1170 tokens
 *
 * So this setting costs about half of what the models allow. A tray of
 * food is a large object in the frame and does not need the detail that
 * the full size buys. Drop MAX_EDGE to 1092 to halve the bill again, and
 * measure the reading accuracy before you keep it.
 */

const MAX_EDGE = 1568;
const QUALITY = 0.85;

export type PreparedImage = {
  /** Base64 without the data URL prefix, which is what the API wants. */
  base64: string;
  mediaType: "image/jpeg";
  /** A data URL for the on-screen preview. */
  previewUrl: string;
  bytes: number;
};

export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await loadBitmap(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot resize the photo.");

  // White behind the photo, so a transparent PNG does not become black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);

  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  const base64 = dataUrl.split(",")[1] ?? "";

  return {
    base64,
    mediaType: "image/jpeg",
    previewUrl: dataUrl,
    bytes: Math.floor((base64.length * 3) / 4),
  };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // imageOrientation honours the EXIF rotation a phone writes.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to the <img> path below.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("That file is not an image."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
