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

/**
 * Read a positive number from the environment, or fall back.
 *
 * Number("") is 0 and Number("abc") is NaN, and ?? catches neither. Both
 * would have turned the rate limit off without a word in the log, so a typo
 * in the Vercel dashboard would silently delete the control.
 */
function positiveEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    console.warn(`[guard] ${name}="${raw}" is not a number. Using ${fallback}.`);
    return fallback;
  }
  return value;
}

/**
 * About 1568 px on the long edge as JPEG is well under this.
 *
 * 3 MB of image is 4 MB of base64, which still fits inside Vercel's request
 * body limit of about 4.5 MB. A higher cap could never be reached: the
 * platform would reject the body first, with an error we cannot explain.
 */
export const MAX_IMAGE_BYTES = positiveEnv("RESCUEFIT_MAX_IMAGE_BYTES", 3_000_000);

/** A donor text message. Long enough for a chatty message, not a novel. */
export const MAX_TEXT_CHARS = positiveEnv("RESCUEFIT_MAX_TEXT_CHARS", 4_000);

/**
 * The largest JSON body any route will read.
 *
 * This is checked from content-length before the body is buffered, so a
 * huge upload is refused without being read into memory first.
 */
export const MAX_BODY_BYTES = positiveEnv("RESCUEFIT_MAX_BODY_BYTES", 4_300_000);

/**
 * Requests allowed per IP per window. Fahd's accuracy run (task X2) sends
 * about 100 images in a batch, so set RESCUEFIT_RATE_LIMIT=0 to turn this
 * off for that run.
 */
const RATE_LIMIT = positiveEnv("RESCUEFIT_RATE_LIMIT", 30);
const RATE_WINDOW_MS = positiveEnv("RESCUEFIT_RATE_WINDOW_MS", 60_000);

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
  // The regex rejects whitespace, newlines, and url-safe characters. The
  // length check catches 4n+1, which passes the regex and can never decode.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 === 1) {
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

/**
 * Refuse a body that is too large before it is buffered into memory.
 *
 * content-length can be absent or wrong, so this is a cheap first gate,
 * not the real cap. The per-field limits below are the real cap.
 */
export function checkBodySize(request: Request): void {
  const header = request.headers.get("content-length");
  if (!header) return;

  const bytes = Number(header);
  if (!Number.isFinite(bytes)) return;

  if (bytes > MAX_BODY_BYTES) {
    throw new InputError(
      `The request is about ${Math.round(bytes / 1_000_000)} MB, over the ` +
        `${Math.round(MAX_BODY_BYTES / 1_000_000)} MB limit. ` +
        "Resize the photo before you upload it.",
      413,
    );
  }
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

/**
 * The caller's IP, as far as it can be trusted.
 *
 * Never take the leftmost x-forwarded-for token. That end of the chain is
 * written by the client, so an attacker sends their own and gets a fresh
 * rate-limit bucket on every request.
 *
 * Vercel sets x-vercel-forwarded-for itself and a client cannot forge it,
 * so it wins. Otherwise take the rightmost XFF token, which is the hop
 * closest to us and the only one our own proxy wrote.
 */
export function callerIp(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",");
    return hops[hops.length - 1].trim();
  }

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
  //
  // The old version deleted only entries whose timestamps had all expired.
  // An attacker rotating the IP keeps every entry fresh, so nothing was
  // ever deleted and the sweep then ran on every request. Clearing is
  // crude, bounded, and costs at most one window of counting.
  if (hits.size > 5_000) hits.clear();
}
