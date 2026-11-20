import { findShelfLife, shelfLifeDays } from "./data";
import shelfLifeFixture from "./fixtures/shelf_life.json";
import { DEMO_PHOTO_ITEMS } from "./demo";
import { ShelfLifeTableSchema, type IntakeItem } from "./schemas";

/**
 * The sample donation.
 *
 * /fit and /plan must never open on an empty state. A judge who follows a
 * deep link from the report has to see the product working. This builds the
 * same list the demo photo returns, so the sample and the demo agree.
 */
export function sampleConsignment(): IntakeItem[] {
  const table = ShelfLifeTableSchema.parse(shelfLifeFixture);

  return DEMO_PHOTO_ITEMS.map((raw) => {
    const row = findShelfLife(table, raw.category, raw.name);
    const storage = raw.storage as IntakeItem["storage"];
    return {
      name: raw.name,
      category: row.category,
      qty: raw.qty,
      unit: raw.unit,
      est_kg: raw.est_kg,
      storage,
      shelf_life_days: shelfLifeDays(row, storage),
      confidence: raw.confidence,
    };
  });
}
