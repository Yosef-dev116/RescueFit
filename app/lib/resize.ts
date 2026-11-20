"use client";

/**
 * Shrink a phone photo in the browser before it is uploaded.
 *
 * A modern phone camera writes 3 to 8 MB per photo, and Vercel caps a
 * request body at about 4.5 MB. Claude also gains nothing from more than
 * about 1568 px on the long edge, so the resize costs no accuracy.
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
