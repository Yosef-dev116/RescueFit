import { NextResponse } from "next/server";

import { loadShelfLife } from "@/lib/data";
import { findShelfLife, shelfLifeDays } from "@/lib/data";
import { checkRateLimit, InputError } from "@/lib/guard";
import { normaliseStorage } from "@/lib/intake";
import { IntakeItemSchema, type IntakeItem } from "@/lib/schemas";

/**
 * Barcode lookup (feature X5).
 *
 * GET /api/barcode?code=0123456789012
 *
 * This route calls Open Food Facts, not Claude, so it works without an API
 * key and is never in demo mode. Open Food Facts asks every client to
 * identify itself in the User-Agent, so we do. No email is sent, because
 * this is a student prototype and an email would be personal data.
 *
 * Open Food Facts data is open under a share-alike licence, so the report
 * must credit it.
 */

export const maxDuration = 30;

const USER_AGENT = "RescueFit/0.1 (student prototype)";
const TIMEOUT_MS = 8_000;

/** Map an Open Food Facts category string onto one of our categories. */
function guessCategory(text: string): string {
  const lower = text.toLowerCase();
  const table: [string, string][] = [
    ["bread", "bread"],
    ["bakery", "bread"],
    ["dairy", "dairy"],
    ["milk", "dairy"],
    ["cheese", "dairy"],
    ["yogurt", "dairy"],
    ["egg", "eggs"],
    ["meat", "meat-fresh"],
    ["poultry", "meat-fresh"],
    ["seafood", "fish"],
    ["fish", "fish"],
    ["frozen", "prepared-hot"],
    ["canned", "canned"],
    ["spread", "canned"],
    ["jam", "canned"],
    ["sauce", "canned"],
    ["honey", "canned"],
    ["oil", "canned"],
    ["rice", "dry-goods"],
    ["flour", "dry-goods"],
    ["sugar", "dry-goods"],
    ["biscuit", "dry-goods"],
    ["bean", "canned"],
    ["beverage", "beverage"],
    ["drink", "beverage"],
    ["juice", "beverage"],
    ["cereal", "dry-goods"],
    ["pasta", "dry-goods"],
    ["snack", "dry-goods"],
    ["vegetable", "produce-hardy"],
    ["fruit", "produce-soft"],
  ];
  for (const [needle, category] of table) {
    if (lower.includes(needle)) return category;
  }
  return "other";
}

export async function GET(request: Request) {
  try {
    checkRateLimit(request);

    const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";

    // A barcode is 8 to 14 digits. Anything else is not worth a round trip,
    // and refusing it here keeps the path into the upstream URL clean.
    if (!/^\d{8,14}$/.test(code)) {
      throw new InputError(
        "Send a barcode of 8 to 14 digits, for example ?code=0123456789012.",
      );
    }

    const url =
      `https://world.openfoodfacts.org/api/v2/product/${code}.json` +
      "?fields=product_name,brands,quantity,categories,product_quantity";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: "application/json" },
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new InputError("Open Food Facts did not answer in time.", 504);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new InputError(
        `Open Food Facts answered ${response.status}.`,
        response.status === 404 ? 404 : 502,
      );
    }

    const data = (await response.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        brands?: string;
        quantity?: string;
        categories?: string;
        product_quantity?: string | number;
      };
    };

    if (data.status !== 1 || !data.product) {
      return NextResponse.json(
        {
          found: false,
          code,
          message:
            "That barcode is not in Open Food Facts. Enter the item by hand.",
          source: "Open Food Facts",
        },
        { status: 404 },
      );
    }

    const product = data.product;
    const name = (product.product_name ?? "").trim() || `item ${code}`;
    const category = guessCategory(product.categories ?? name);

    const table = loadShelfLife();
    const row = findShelfLife(table.value, category, name);
    const storage = normaliseStorage("", category);

    // product_quantity is grams when it is present at all.
    const grams = Number(product.product_quantity);
    const estKg =
      Number.isFinite(grams) && grams > 0
        ? Math.round((grams / 1000) * 100) / 100
        : 0.5;

    const item: IntakeItem = IntakeItemSchema.parse({
      name: product.brands ? `${name} (${product.brands.split(",")[0].trim()})` : name,
      category: row.category,
      qty: 1,
      unit: product.quantity?.trim() || "each",
      est_kg: estKg,
      storage,
      shelf_life_days: shelfLifeDays(row, storage),
      // A database lookup is not a guess, but the weight and the storage
      // type are inferred, so this is not full confidence.
      confidence: 0.95,
    });

    return NextResponse.json({
      found: true,
      code,
      item,
      shelf_life_source: table.source,
      source: "Open Food Facts",
      licence: "Open Database Licence (ODbL). Credit it in the report.",
    });
  } catch (error) {
    if (error instanceof InputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[barcode] failed", error);
    return NextResponse.json(
      { error: "The barcode lookup failed." },
      { status: 502 },
    );
  }
}
