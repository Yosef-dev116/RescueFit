import type { Agency, IntakeItem, StorageType } from "./schemas";

/**
 * The fit check (feature C2).
 *
 * This is plain TypeScript, not an AI call. A kitchen manager must be able to
 * read the reason line and check the arithmetic. The engine is pure: it never
 * changes the agency objects it is given.
 *
 * Three limits decide what a kitchen can take:
 *
 * 1. Space. Free kg in the storage type the item needs.
 * 2. Time. The kitchen can only serve so much before the item expires:
 *    shelf_life_days x meals_per_day x kg_per_meal.
 * 3. Diet. A halal or vegetarian kitchen cannot use some items at all.
 *
 * Items are handled in expiry order, soonest first, and they share the space.
 * Whatever does not fit goes to the nearest agency that has room for it.
 */

export type FitDecision = "accept" | "accept-part" | "redirect";

export type RedirectTarget = {
  agency_id: string;
  name: string;
  town: string;
  distance_km: number;
};

export type FitResult = {
  item: IntakeItem;
  decision: FitDecision;
  accepted_kg: number;
  redirected_kg: number;
  /** kg that no agency in the list can take. */
  unplaced_kg: number;
  reason: string;
  redirect_to?: RedirectTarget;
};

export type FitReport = {
  agency: Agency;
  results: FitResult[];
  totals: {
    offered_kg: number;
    accepted_kg: number;
    redirected_kg: number;
    unplaced_kg: number;
  };
  /** Free kg left at the receiving kitchen after the plan. */
  free_kg_after: Record<StorageType, number>;
};

export type FitInput = {
  items: IntakeItem[];
  agency: Agency;
  /** Other agencies that can take surplus. The receiving one is ignored. */
  others?: Agency[];
  /** From impact_factors.json. Kitchen plates about this much per meal. */
  kgPerMeal?: number;
};

/** Items that a halal kitchen cannot serve. */
const NOT_HALAL = [
  "pork",
  "ham",
  "bacon",
  "lard",
  "gelatin",
  "prosciutto",
  "pepperoni",
  "chorizo",
  "salami",
  "wine",
  "beer",
  "rum",
];

/** Items that a vegetarian kitchen cannot serve. */
const NOT_VEGETARIAN = [
  "chicken",
  "beef",
  "pork",
  "turkey",
  "lamb",
  "bacon",
  "ham",
  "sausage",
  "meat",
  "fish",
  "salmon",
  "cod",
  "haddock",
  "tuna",
  "shrimp",
  "lobster",
  "mussel",
  "oyster",
];

const MEAT_CATEGORIES = ["meat-fresh", "fish"];

/** Round kg to two decimals, so reason lines stay readable. */
function kg(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Great-circle distance in km.
 *
 * The item shape has no diet field, so a diet clash has to be read from the
 * item name and category. This keeps the shared data contract unchanged.
 */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Why this agency cannot serve this item at all, or null when it can.
 */
export function dietConflict(item: IntakeItem, agency: Agency): string | null {
  const text = `${item.name} ${item.category}`.toLowerCase();
  const isMeat =
    MEAT_CATEGORIES.includes(item.category.toLowerCase()) ||
    NOT_VEGETARIAN.some((word) => text.includes(word));

  for (const flag of agency.diet_flags) {
    const normalised = flag.toLowerCase();
    if (normalised.startsWith("halal")) {
      const hit = NOT_HALAL.find((word) => text.includes(word));
      if (hit) return `not halal (${hit})`;
    }
    if (normalised.startsWith("vegetarian") && isMeat) {
      return "not vegetarian";
    }
  }
  return null;
}

/** Free kg per storage type, as a plain object we can decrement. */
function freeKgCopy(agency: Agency): Record<StorageType, number> {
  return {
    fridge: agency.free_kg.fridge,
    freezer: agency.free_kg.freezer,
    dry: agency.free_kg.dry,
  };
}

/**
 * Run the fit check for one donation at one agency.
 */
export function checkFit(input: FitInput): FitReport {
  const { items, agency } = input;
  const kgPerMeal = input.kgPerMeal ?? 0.54;

  // Running free space at the receiving kitchen. Items share it.
  const free = freeKgCopy(agency);

  // Running free space at every other agency, so two redirects cannot both
  // claim the same shelf.
  const otherAgencies = (input.others ?? []).filter((a) => a.id !== agency.id);
  const otherFree = new Map<string, Record<StorageType, number>>(
    otherAgencies.map((a) => [a.id, freeKgCopy(a)]),
  );

  // Soonest expiry first. That food gets first claim on the space.
  const ordered = [...items].sort(
    (a, b) => a.shelf_life_days - b.shelf_life_days,
  );

  const results: FitResult[] = [];

  for (const item of ordered) {
    const storage = item.storage;
    const offered = item.est_kg;

    const conflict = dietConflict(item, agency);
    if (conflict) {
      const placed = placeSurplus(item, offered);
      results.push({
        item,
        decision: "redirect",
        accepted_kg: 0,
        redirected_kg: placed.redirected_kg,
        unplaced_kg: placed.unplaced_kg,
        reason: `${agency.name} cannot serve this: ${conflict}. ${placed.note}`,
        redirect_to: placed.target,
      });
      continue;
    }

    // Limit 1: space.
    const spaceLimit = free[storage];
    // Limit 2: time. How much the kitchen can plate before it expires.
    const useLimit = item.shelf_life_days * agency.meals_per_day * kgPerMeal;

    const accepted = Math.max(0, Math.min(offered, spaceLimit, useLimit));
    const leftover = Math.max(0, offered - accepted);
    free[storage] = kg(free[storage] - accepted);

    if (leftover <= 0.001) {
      results.push({
        item,
        decision: "accept",
        accepted_kg: kg(accepted),
        redirected_kg: 0,
        unplaced_kg: 0,
        reason:
          `Accept all ${kg(offered)} kg. ` +
          `${kg(free[storage])} kg ${storage} space left. ` +
          `Lasts ${item.shelf_life_days} days, and the kitchen can plate ` +
          `${kg(useLimit)} kg in that time.`,
        });
      continue;
    }

    const placed = placeSurplus(item, leftover);
    const binding =
      spaceLimit < useLimit
        ? `only ${kg(spaceLimit)} kg of ${storage} space`
        : `the kitchen can only plate ${kg(useLimit)} kg in ` +
          `${item.shelf_life_days} days at ${agency.meals_per_day} meals per day`;

    results.push({
      item,
      decision: accepted > 0.001 ? "accept-part" : "redirect",
      accepted_kg: kg(accepted),
      redirected_kg: placed.redirected_kg,
      unplaced_kg: placed.unplaced_kg,
      reason:
        `Offered ${kg(offered)} kg, keep ${kg(accepted)} kg: ${binding}. ` +
        placed.note,
      redirect_to: placed.target,
    });
  }

  /**
   * Send surplus kg to the nearest other agency with room for all of it.
   * It claims the space, so a later item cannot be sent to the same shelf.
   */
  function placeSurplus(
    item: IntakeItem,
    surplusKg: number,
  ): {
    redirected_kg: number;
    unplaced_kg: number;
    target?: RedirectTarget;
    note: string;
  } {
    const storage = item.storage;

    const candidates = otherAgencies
      .filter((other) => dietConflict(item, other) === null)
      .filter((other) => (otherFree.get(other.id)?.[storage] ?? 0) >= surplusKg)
      .map((other) => ({ other, km: haversineKm(agency, other) }))
      .sort((a, b) => a.km - b.km);

    const best = candidates[0];
    if (!best) {
      return {
        redirected_kg: 0,
        unplaced_kg: kg(surplusKg),
        note:
          `No agency on the list has ${kg(surplusKg)} kg of free ${storage} ` +
          `space. Freeze it, serve it today, or call the network.`,
      };
    }

    const targetFree = otherFree.get(best.other.id);
    if (targetFree) {
      targetFree[storage] = kg(targetFree[storage] - surplusKg);
    }

    return {
      redirected_kg: kg(surplusKg),
      unplaced_kg: 0,
      target: {
        agency_id: best.other.id,
        name: best.other.name,
        town: best.other.town,
        distance_km: Math.round(best.km * 10) / 10,
      },
      note:
        `Send ${kg(surplusKg)} kg to ${best.other.name} in ` +
        `${best.other.town}, ${Math.round(best.km * 10) / 10} km away.`,
    };
  }

  const totals = results.reduce(
    (sum, r) => ({
      offered_kg: kg(sum.offered_kg + r.item.est_kg),
      accepted_kg: kg(sum.accepted_kg + r.accepted_kg),
      redirected_kg: kg(sum.redirected_kg + r.redirected_kg),
      unplaced_kg: kg(sum.unplaced_kg + r.unplaced_kg),
    }),
    { offered_kg: 0, accepted_kg: 0, redirected_kg: 0, unplaced_kg: 0 },
  );

  return { agency, results, totals, free_kg_after: free };
}
