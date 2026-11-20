import {
  IntakeItemSchema,
  STORAGE_TYPES,
  type IntakeItem,
  type LlmItem,
  type ShelfLife,
  type StorageType,
} from "./schemas";
import { findShelfLife, shelfLifeDays } from "./data";

/**
 * Turn a loose Claude reply into items that match the shared contract.
 *
 * The model is asked for the right shape, but it is not forced into the zod
 * bounds (zodOutputFormat drops them). So every field is clamped here, and
 * the shelf life comes from the shared table, never from the model.
 */

function clamp(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return low;
  return Math.min(high, Math.max(low, value));
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Map any string the model returns onto one of the three storage types. */
export function normaliseStorage(raw: string, category: string): StorageType {
  const text = `${raw} ${category}`.toLowerCase();
  if (text.includes("freez") || text.includes("frozen")) return "freezer";
  if (
    text.includes("fridge") ||
    text.includes("refriger") ||
    text.includes("chill") ||
    text.includes("cold")
  ) {
    return "fridge";
  }
  if (STORAGE_TYPES.includes(raw as StorageType)) return raw as StorageType;
  return "dry";
}

/**
 * Storage for an item that arrives with no storage hint, such as a barcode
 * scan. A frozen or chilled word in the product text wins. Otherwise the
 * shelf-life row decides: shelf-stable food goes dry, food with no pantry
 * life goes in the fridge, and food with no fridge life goes in the freezer.
 */
export function storageFor(
  row: { pantry_days: number; fridge_days: number; freezer_days: number },
  hint: string,
): StorageType {
  const fromHint = normaliseStorage("", hint);
  if (fromHint !== "dry") return fromHint;
  if (row.pantry_days > 0) return "dry";
  if (row.fridge_days > 0) return "fridge";
  return "freezer";
}

export function normaliseItems(
  raw: LlmItem[],
  shelfLifeTable: ShelfLife[],
): IntakeItem[] {
  const items: IntakeItem[] = [];

  for (const candidate of raw) {
    const name = candidate.name.trim() || "unnamed item";
    const category = candidate.category.trim().toLowerCase() || "other";
    const storage = normaliseStorage(candidate.storage, category);

    const row = findShelfLife(shelfLifeTable, category, name);
    const days = shelfLifeDays(row, storage);

    const item: IntakeItem = {
      name,
      // Use the matched row's category, so the category is always one the
      // impact factors and the shelf life table both know.
      category: row.category,
      qty: round(clamp(candidate.qty, 0, 100_000)),
      unit: candidate.unit.trim() || "each",
      est_kg: round(clamp(candidate.est_kg, 0, 10_000)),
      storage,
      shelf_life_days: days,
      confidence: round(clamp(candidate.confidence, 0, 1)),
    };

    // A last guard. If the item still breaks the contract, drop it rather
    // than send a bad shape to Fahd's pages.
    const checked = IntakeItemSchema.safeParse(item);
    if (checked.success) items.push(checked.data);
  }

  return items;
}

/** The system prompt for photo and text intake (features C1 and X4). */
export function intakeSystemPrompt(categories: string[]): string {
  return [
    "You log food donations for a charity kitchen in Prince Edward Island.",
    "Read the photo or the message and list every distinct food item.",
    "",
    "Rules:",
    "- Give one entry per distinct food, not one per package.",
    "- qty and unit describe what a volunteer would count, such as 30 each,",
    "  2 tray, or 12 kg.",
    "- est_kg is your best estimate of the total edible weight in kilograms.",
    "  A bagel is about 0.1 kg. A full hotel tray of lasagna is about 4 kg.",
    "  A loaf of bread is about 0.6 kg. A sandwich is about 0.2 kg.",
    "- storage is exactly one of: fridge, freezer, dry.",
    "- confidence is 0 to 1. Use a low number when the photo is unclear.",
    `- category must be one of: ${categories.join(", ")}.`,
    "- Do not invent items you cannot see or read.",
    "- Return an empty list when there is no food.",
  ].join("\n");
}
