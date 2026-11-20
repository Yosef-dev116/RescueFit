import shelfLifeFixture from "./fixtures/shelf_life.json";
import { DEMO_PHOTO_ITEMS } from "./demo";
import { normaliseItems } from "./intake";
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

  return normaliseItems(DEMO_PHOTO_ITEMS, table);
}
