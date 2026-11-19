/**
 * Input limits and a best-effort rate limit for the AI routes.
 *
 * Every AI call costs money, so an open route is a bill waiting to happen.
 * These checks are the cheap first line: cap the input, then cap the rate.
 *
 * The rate limit is in-memory, so it is best effort only. Serverless runs
 * many instances and each one keeps its own counter. It stops a stuck retry
 * loop or one impatient volunteer. It does not stop a real attack.
 */

/** About 1568 px on the long edge as JPEG is well under this. */
export const MAX_IMAGE_BYTES = Number(
  process.env.RESCUEFIT_MAX_IMAGE_BYTES ?? 4_000_000,
);

/** A donor text message. Long enough for a chatty message, not a novel. */
export const MAX_TEXT_CHARS = Number(
  process.env.RESCUEFIT_MAX_TEXT_CHARS ?? 4_000,
);

/**
 * Requests allowed per IP per window. Fahd's accuracy run (task X2) sends
 * about 100 images in a batch, so set RESCUEFIT_RATE_LIMIT=0 to turn this
 * off for that run.
 */
const RATE_LIMIT = Number(process.env.RESCUEFIT_RATE_LIMIT ?? 30);
const RATE_WINDOW_MS = Number(process.env.RESCUEFIT_RATE_WINDOW_MS ?? 60_000);

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ImageMediaType = (typeof ALLOWED_IMAGE_TYPES)[number];

export class InputError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "InputError";
    this.status = status;
  }
}

/**
 * Accept a bare base64 string or a data URL, and return the two parts.
 * It rejects anything that is not one of the four image types we allow.
 */
export function readImage(
  raw: string,
  declaredType?: string,
): { data: string; mediaType: ImageMediaType } {
  let base64 = raw.trim();
  let mediaType = declaredType;

  const dataUrl = /^data:([^;,]+);base64,([\s\S]*)$/.exec(base64);
  if (dataUrl) {
    mediaType = dataUrl[1];
    base64 = dataUrl[2];
  }

  if (!mediaType) {
    throw new InputError("The image needs a media type, such as image/jpeg.");
  }
  if (!ALLOWED_IMAGE_TYPES.includes(mediaType as ImageMediaType)) {
    throw new InputError(
      `Image type ${mediaType} is not allowed. ` +
        `Use ${ALLOWED_IMAGE_TYPES.join(", ")}.`,
    );
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new InputError("The image is not valid base64.");
  }

  // Base64 carries 3 bytes in every 4 characters.
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) {
    throw new InputError(
      `The image is about ${Math.round(bytes / 1000)} kB, over the ` +
        `${Math.round(MAX_IMAGE_BYTES / 1000)} kB limit. ` +
        "Resize it before you upload it.",
      413,
    );
  }

  return { data: base64, mediaType: mediaType as ImageMediaType };
}

export function readText(raw: string): string {
  const text = raw.trim();
  if (text.length === 0) {
    throw new InputError("The message is empty.");
  }
  if (text.length > MAX_TEXT_CHARS) {
    throw new InputError(
      `The message is ${text.length} characters, over the ` +
        `${MAX_TEXT_CHARS} character limit.`,
      413,
    );
  }
  return text;
}

// ------------------------------------------------------------- rate limit

const hits = new Map<string, number[]>();

/** Read the caller's IP from the proxy headers Vercel sets. */
export function callerIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Throw when this IP is over the limit. Set RESCUEFIT_RATE_LIMIT=0 to allow
 * everything, which Fahd's 100-image batch needs.
 */
export function checkRateLimit(request: Request): void {
  if (RATE_LIMIT <= 0) return;

  const ip = callerIp(request);
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(
    (time) => now - time < RATE_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT) {
    throw new InputError(
      `Too many requests. The limit is ${RATE_LIMIT} every ` +
        `${Math.round(RATE_WINDOW_MS / 1000)} seconds.`,
      429,
    );
  }

  recent.push(now);
  hits.set(ip, recent);

  // Keep the map small. It lives for the life of the instance.
  if (hits.size > 5_000) {
    for (const [key, times] of hits) {
      if (times.every((time) => now - time >= RATE_WINDOW_MS)) hits.delete(key);
    }
  }
}
