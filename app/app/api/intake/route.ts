import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { askClaude, currentMode, readableError } from "@/lib/claude";
import { loadImpactFactors, loadShelfLife } from "@/lib/data";
import { DEMO_PHOTO_ITEMS, DEMO_TEXT_ITEMS } from "@/lib/demo";
import { checkRateLimit, InputError, readImage, readText } from "@/lib/guard";
import { intakeSystemPrompt, normaliseItems } from "@/lib/intake";
import { LlmIntakeSchema, type IntakeItem, type Mode } from "@/lib/schemas";

/**
 * Snap intake (feature C1) and donor text intake (feature X4).
 *
 * POST a photo or a message, get the item list from the data contract back.
 *
 * Body:
 *   { "image": "<base64 or data URL>", "media_type": "image/jpeg" }
 *   { "text": "40 sandwiches, 2 trays lasagna" }
 *
 * The reply always carries "mode". Fahd's accuracy script (task F6) must
 * reject mode "demo", or the measured number means nothing.
 */

// A photo takes the model longer than a text message.
export const maxDuration = 60;

type IntakeResponseBody = {
  items: IntakeItem[];
  mode: Mode;
  /** Whether the shelf life table came from Fahd's file or the fixture. */
  shelf_life_source: "data" | "fixture";
  warnings: string[];
  usage?: { input_tokens: number; output_tokens: number; usd_cost: number };
  model?: string;
};

export async function POST(request: Request) {
  try {
    checkRateLimit(request);

    const body = (await request.json()) as {
      image?: unknown;
      media_type?: unknown;
      text?: unknown;
    };

    const hasImage = typeof body.image === "string" && body.image.length > 0;
    const hasText = typeof body.text === "string" && body.text.length > 0;

    if (!hasImage && !hasText) {
      throw new InputError('Send either "image" or "text".');
    }

    // Check the size limits before anything else, demo mode included.
    // A demo route that accepts a 20 MB body is still a way to hurt us.
    const image = hasImage
      ? readImage(
          body.image as string,
          typeof body.media_type === "string" ? body.media_type : undefined,
        )
      : null;
    const text = hasImage ? null : readText(body.text as string);

    const shelfLife = loadShelfLife();
    const factors = loadImpactFactors();
    const warnings = [shelfLife.warning, factors.warning].filter(
      (w): w is string => Boolean(w),
    );

    const mode = currentMode();

    // Demo mode. No credentials, so answer with a canned list that still
    // runs through the same normaliser as a real reply.
    if (mode === "demo") {
      const raw = image ? DEMO_PHOTO_ITEMS : DEMO_TEXT_ITEMS;
      const payload: IntakeResponseBody = {
        items: normaliseItems(raw, shelfLife.value),
        mode,
        shelf_life_source: shelfLife.source,
        warnings: [
          ...warnings,
          "Demo mode. No ANTHROPIC_API_KEY is set, so this is a canned " +
            "result, not a real reading of the input.",
        ],
      };
      return NextResponse.json(payload);
    }

    const content: Anthropic.Beta.BetaContentBlockParam[] = [];

    if (image) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType,
          data: image.data,
        },
      });
      content.push({
        type: "text",
        text: "List every food item in this donation photo.",
      });
    } else {
      content.push({
        type: "text",
        text: `A donor sent this message. List the food items.\n\n${text}`,
      });
    }

    const categories = Object.keys(factors.value.categories);

    // Low effort. This is extraction, not reasoning.
    const answer = await askClaude({
      schema: LlmIntakeSchema,
      system: intakeSystemPrompt(categories),
      content,
      effort: "low",
    });

    // The shelf life always comes from the shared table, never the model.
    const items = normaliseItems(answer.value.items, shelfLife.value);

    const payload: IntakeResponseBody = {
      items,
      mode,
      shelf_life_source: shelfLife.source,
      warnings,
      usage: answer.usage,
      model: answer.model,
    };

    // Logged so we can quote a cost per photo in the prototype guide.
    console.info(
      `[intake] model=${answer.model} items=${items.length} ` +
        `in=${answer.usage.input_tokens} out=${answer.usage.output_tokens} ` +
        `usd=${answer.usage.usd_cost}`,
    );

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof InputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[intake] failed", error);
    return NextResponse.json({ error: readableError(error) }, { status: 502 });
  }
}
