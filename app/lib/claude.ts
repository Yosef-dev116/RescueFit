import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

import type { Mode } from "./schemas";

/**
 * The Anthropic client and one wrapper around the structured-output call.
 *
 * Demo mode. This machine has no credentials, so every route can answer with
 * a canned result instead of failing. Every response carries its mode, and
 * the UI shows a badge. Fahd's accuracy script (task F6) must reject any
 * response with mode "demo", or the measured number is meaningless.
 */

/**
 * Opus 5.5 is the default. The team plan names claude-sonnet-5-5, so set
 * RESCUEFIT_MODEL to switch without a code change.
 */
export const MODEL = process.env.RESCUEFIT_MODEL ?? "claude-opus-5-5";

/** Price per million tokens, for the cost line in the prototype guide. */
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

/**
 * An unset ANTHROPIC_API_KEY does not always mean there are no credentials.
 * The SDK also reads ANTHROPIC_AUTH_TOKEN and an `ant auth login` profile.
 * We can only check the two environment variables from inside a route.
 */
export function hasCredentials(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN,
  );
}

export function currentMode(): Mode {
  return hasCredentials() ? "live" : "demo";
}

let cached: Anthropic | null = null;

export function getClient(): Anthropic {
  cached ??= new Anthropic();
  return cached;
}

export type AskUsage = {
  input_tokens: number;
  output_tokens: number;
  /** Cost of this one call in CAD cents, at the listed USD rate. */
  usd_cost: number;
};

export class RefusalError extends Error {
  constructor(category: string | null | undefined, explanation?: string) {
    super(
      `Claude declined this request (${category ?? "no category"}). ` +
        (explanation ?? "Try a different photo or describe the donation."),
    );
    this.name = "RefusalError";
  }
}

export class EmptyParseError extends Error {
  constructor() {
    super("Claude replied with no usable JSON.");
    this.name = "EmptyParseError";
  }
}

export type AskOptions<T extends z.ZodType> = {
  /** The loose schema. Clamp and validate the result yourself afterwards. */
  schema: T;
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  /** low for extraction, medium for planning. */
  effort: "low" | "medium" | "high";
  maxTokens?: number;
};

export type AskResult<T> = {
  value: T;
  usage: AskUsage;
  /** The model that actually answered. A fallback can change it. */
  model: string;
};

/**
 * One structured-output call.
 *
 * Notes on the choices here:
 *
 * - Thinking cannot be turned off on Opus 5.5, so effort is the only dial.
 * - No temperature. The API rejects it on this model.
 * - Server-side fallbacks are on, so a safety decline retries on another
 *   model inside the same call instead of failing the volunteer's upload.
 * - stop_reason "refusal" is a 200 response, so it must be checked by hand.
 */
export async function askClaude<T extends z.ZodType>(
  options: AskOptions<T>,
): Promise<AskResult<z.infer<T>>> {
  const client = getClient();

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: options.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: options.system,
    output_config: {
      effort: options.effort,
      format: zodOutputFormat(options.schema),
    },
    messages: [{ role: "user", content: options.content }],
  });

  if (response.stop_reason === "refusal") {
    throw new RefusalError(
      response.stop_details?.category,
      response.stop_details?.explanation ?? undefined,
    );
  }

  if (!response.parsed_output) {
    throw new EmptyParseError();
  }

  return {
    value: response.parsed_output as z.infer<T>,
    usage: measure(response.model, response.usage),
    model: response.model,
  };
}

function measure(
  model: string,
  usage: { input_tokens: number; output_tokens: number },
): AskUsage {
  const price = PRICE_PER_MTOK[model] ?? PRICE_PER_MTOK["claude-opus-5-5"];
  const usd =
    (usage.input_tokens / 1_000_000) * price.input +
    (usage.output_tokens / 1_000_000) * price.output;
  return {
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    usd_cost: Math.round(usd * 100_000) / 100_000,
  };
}

/** Turn any thrown error into a message a volunteer can read. */
export function readableError(error: unknown): string {
  if (error instanceof RefusalError || error instanceof EmptyParseError) {
    return error.message;
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return "The API key is missing or wrong. Check app/.env.local.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Too many requests right now. Wait a few seconds and try again.";
  }
  if (error instanceof Anthropic.BadRequestError) {
    return `The request was rejected: ${error.message}`;
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Could not reach the Claude API. Check the network.";
  }
  if (error instanceof Anthropic.APIError) {
    return `Claude API error ${error.status ?? ""}: ${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return "Unknown error.";
}
