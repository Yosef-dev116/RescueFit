import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { askClaude, currentMode, readableError } from "@/lib/claude";
import { DEMO_SPOILAGE } from "@/lib/demo";
import { checkRateLimit, InputError, readImage } from "@/lib/guard";
import {
  LlmSpoilageSchema,
  SPOILAGE_VERDICTS,
  SpoilageResultSchema,
  type Mode,
  type SpoilageResult,
  type SpoilageVerdict,
} from "@/lib/schemas";

/**
 * The spoilage check (feature X3).
 *
 * POST a photo of produce. Get Fresh, Use today, or Compost.
 *
 * This is deliberately cautious. A charity kitchen serves people who have
 * no other option, so the prompt is told to round down, and anything the
 * model is unsure about becomes "use today" rather than "fresh".
 */

export const maxDuration = 60;

type SpoilageResponseBody = {
  result: SpoilageResult;
  mode: Mode;
  warnings: string[];
  usage?: { input_tokens: number; output_tokens: number; usd_cost: number };
  model?: string;
};

/** Map whatever wording the model uses onto the three verdicts. */
function readVerdict(raw: string): SpoilageVerdict {
  const text = raw.toLowerCase().replace(/[\s_]+/g, "-");
  if (SPOILAGE_VERDICTS.includes(text as SpoilageVerdict)) {
    return text as SpoilageVerdict;
  }
  if (text.includes("compost") || text.includes("discard")) return "compost";
  if (text.includes("fresh") || text.includes("good")) return "fresh";
  // Anything unclear rounds to the cautious answer, never to "fresh".
  return "use-today";
}

export async function POST(request: Request) {
  try {
    checkRateLimit(request);

    const body = (await request.json()) as {
      image?: unknown;
      media_type?: unknown;
    };

    if (typeof body.image !== "string" || body.image.length === 0) {
      throw new InputError('Send an "image" of the produce.');
    }

    const image = readImage(
      body.image,
      typeof body.media_type === "string" ? body.media_type : undefined,
    );

    const mode = currentMode();

    if (mode === "demo") {
      const payload: SpoilageResponseBody = {
        result: SpoilageResultSchema.parse(DEMO_SPOILAGE),
        mode,
        warnings: [
          "Demo mode. No ANTHROPIC_API_KEY is set, so this verdict is " +
            "canned and does not describe your photo.",
        ],
      };
      return NextResponse.json(payload);
    }

    const content: Anthropic.Beta.BetaContentBlockParam[] = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType,
          data: image.data,
        },
      },
      { type: "text", text: "Judge this produce." },
    ];

    const answer = await askClaude({
      schema: LlmSpoilageSchema,
      effort: "low",
      system: [
        "You check donated produce for a charity kitchen in Prince Edward",
        "Island. People who eat here often have no other option, so a wrong",
        "'fresh' is far worse than a wrong 'use today'.",
        "",
        "Return exactly one verdict:",
        "- fresh: sound, and it keeps for several more days.",
        "- use-today: still safe, but it must be cooked or served today.",
        "  Soft, spotted, wilted, or bruised produce belongs here.",
        "- compost: mould, slime, a bad smell you can see evidence of, or",
        "  rot. It must not be served.",
        "",
        "Rules:",
        "- When you are unsure between two verdicts, pick the safer one.",
        "- reason is one or two plain sentences a volunteer can act on.",
        "- name is the produce you can see.",
        "- confidence is 0 to 1, and it should be low for a dark or blurred",
        "  photo.",
        "- Never say food is safe when any part of it shows mould.",
      ].join("\n"),
      content,
    });

    const result = SpoilageResultSchema.parse({
      name: answer.value.name.trim() || "produce",
      verdict: readVerdict(answer.value.verdict),
      reason:
        answer.value.reason.trim() ||
        "No reason was given, so treat this as use today.",
      confidence: Math.min(1, Math.max(0, answer.value.confidence)),
    });

    console.info(
      `[spoilage] model=${answer.model} verdict=${result.verdict} ` +
        `usd=${answer.usage.usd_cost}`,
    );

    const payload: SpoilageResponseBody = {
      result,
      mode,
      warnings: [],
      usage: answer.usage,
      model: answer.model,
    };
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof InputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[spoilage] failed", error);
    return NextResponse.json({ error: readableError(error) }, { status: 502 });
  }
}
