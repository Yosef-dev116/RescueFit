import { NextResponse } from "next/server";

import { askClaude, currentMode, readableError } from "@/lib/claude";
import { loadImpactFactors } from "@/lib/data";
import { DEMO_PLAN } from "@/lib/demo";
import { checkRateLimit, InputError } from "@/lib/guard";
import {
  IntakeItemSchema,
  LlmPlanSchema,
  PlanSchema,
  type IntakeItem,
  type Mode,
  type Plan,
} from "@/lib/schemas";

/**
 * The use-first plan (feature C4).
 *
 * POST the accepted items and the kitchen's meals per day. Get a three-day
 * menu that cooks the soonest expiry first.
 *
 * The sort order is decided here, not by the model. The model writes the
 * menu, and it is told the order it has to respect.
 */

export const maxDuration = 60;

type PlanResponseBody = {
  plan: Plan;
  mode: Mode;
  warnings: string[];
  usage?: { input_tokens: number; output_tokens: number; usd_cost: number };
  model?: string;
};

const MAX_ITEMS = 40;

export async function POST(request: Request) {
  try {
    checkRateLimit(request);

    const body = (await request.json()) as {
      items?: unknown;
      meals_per_day?: unknown;
      kitchen?: unknown;
    };

    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new InputError('Send a non-empty "items" array.');
    }
    if (body.items.length > MAX_ITEMS) {
      throw new InputError(
        `Send at most ${MAX_ITEMS} items. This request had ${body.items.length}.`,
      );
    }

    const parsedItems = IntakeItemSchema.array().safeParse(body.items);
    if (!parsedItems.success) {
      throw new InputError(
        "The items do not match the agreed shape from TEAM_PLAN section 6.",
      );
    }

    const mealsPerDay =
      typeof body.meals_per_day === "number" && body.meals_per_day > 0
        ? Math.min(5_000, Math.round(body.meals_per_day))
        : 100;

    const kitchen =
      typeof body.kitchen === "string" && body.kitchen.trim().length > 0
        ? body.kitchen.trim().slice(0, 120)
        : "the kitchen";

    // The code decides the order. Soonest expiry first, then the heaviest,
    // so a tie goes to the item that would waste the most.
    const ordered: IntakeItem[] = [...parsedItems.data].sort(
      (a, b) =>
        a.shelf_life_days - b.shelf_life_days || b.est_kg - a.est_kg,
    );

    const factors = loadImpactFactors();
    const warnings = factors.warning ? [factors.warning] : [];

    const mode = currentMode();

    if (mode === "demo") {
      const payload: PlanResponseBody = {
        plan: PlanSchema.parse(DEMO_PLAN),
        mode,
        warnings: [
          ...warnings,
          "Demo mode. No ANTHROPIC_API_KEY is set, so this menu is canned " +
            "and does not describe the items you sent.",
        ],
      };
      return NextResponse.json(payload);
    }

    const roster = ordered
      .map(
        (item, index) =>
          `${index + 1}. ${item.name} (${item.category}): ` +
          `${item.qty} ${item.unit}, ${item.est_kg} kg, ${item.storage}, ` +
          `${item.shelf_life_days} day(s) left`,
      )
      .join("\n");

    // Medium effort. Writing a workable menu takes more than extraction.
    const answer = await askClaude({
      schema: LlmPlanSchema,
      effort: "medium",
      system: [
        `You plan meals for ${kitchen}, a charity kitchen that serves`,
        `about ${mealsPerDay} meals per day.`,
        "",
        "Write a three-day menu and prep list from the donated items below.",
        "",
        "Rules:",
        "- The list is already sorted. Item 1 expires soonest. Use it first.",
        "- Any item with 2 or fewer days left must be served on day 1.",
        "- Every meal names the items it uses, by their exact names.",
        "- Give 2 or 3 meals per day, and real serving counts that add up to",
        `  about ${mealsPerDay} servings per day.`,
        "- The prep list holds food-safety and timing steps a cook acts on,",
        "  such as thawing, portioning, labelling, or freezing a surplus.",
        "- waste_warning names the one item most likely to be wasted, and",
        "  what to do about it today.",
        "- Plain kitchen English. No marketing words.",
      ].join("\n"),
      content: [
        {
          type: "text",
          text: `Donated items, soonest expiry first:\n\n${roster}`,
        },
      ],
    });

    // The model's shape is loose, so tighten it before it leaves the route.
    const tightened = PlanSchema.safeParse({
      days: answer.value.days.map((day, index) => ({
        ...day,
        day: Math.max(1, Math.round(day.day) || index + 1),
        meals: day.meals.map((meal) => ({
          ...meal,
          servings: Math.max(0, Math.round(meal.servings)),
        })),
      })),
      prep_list: answer.value.prep_list,
      waste_warning: answer.value.waste_warning,
    });

    if (!tightened.success) {
      throw new Error("Claude returned a menu this app cannot display.");
    }

    console.info(
      `[plan] model=${answer.model} days=${tightened.data.days.length} ` +
        `in=${answer.usage.input_tokens} out=${answer.usage.output_tokens} ` +
        `usd=${answer.usage.usd_cost}`,
    );

    const payload: PlanResponseBody = {
      plan: tightened.data,
      mode,
      warnings,
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
    console.error("[plan] failed", error);
    return NextResponse.json({ error: readableError(error) }, { status: 502 });
  }
}
