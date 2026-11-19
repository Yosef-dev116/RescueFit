import { describe, expect, it } from "vitest";

import { checkFit, dietConflict, haversineKm } from "./fit";
import type { Agency, IntakeItem } from "./schemas";

/** A kitchen with lots of time, so space is the only limit by default. */
function agency(over: Partial<Agency> = {}): Agency {
  return {
    id: "home",
    name: "Home Kitchen",
    town: "Charlottetown",
    lat: 46.2382,
    lon: -63.1311,
    capacity_kg: { fridge: 500, freezer: 500, dry: 500 },
    free_kg: { fridge: 100, freezer: 100, dry: 100 },
    meals_per_day: 1000,
    diet_flags: [],
    ...over,
  };
}

function item(over: Partial<IntakeItem> = {}): IntakeItem {
  return {
    name: "bagels",
    category: "bread",
    qty: 30,
    unit: "each",
    est_kg: 10,
    storage: "dry",
    shelf_life_days: 5,
    confidence: 0.9,
    ...over,
  };
}

describe("haversineKm", () => {
  it("measures Charlottetown to Summerside at about 50 km", () => {
    const km = haversineKm(
      { lat: 46.2382, lon: -63.1311 },
      { lat: 46.3959, lon: -63.7877 },
    );
    expect(km).toBeGreaterThan(45);
    expect(km).toBeLessThan(60);
  });

  it("returns zero for the same point", () => {
    const point = { lat: 46.2382, lon: -63.1311 };
    expect(haversineKm(point, point)).toBe(0);
  });
});

describe("checkFit space limit", () => {
  it("accepts an item that fits", () => {
    const report = checkFit({ items: [item()], agency: agency() });
    expect(report.results[0].decision).toBe("accept");
    expect(report.results[0].accepted_kg).toBe(10);
    expect(report.free_kg_after.dry).toBe(90);
  });

  it("makes items share the free space, soonest expiry first", () => {
    // Each item fits on its own. Together they do not.
    const home = agency({ free_kg: { fridge: 0, freezer: 0, dry: 60 } });
    const soon = item({ name: "fresh bagels", est_kg: 50, shelf_life_days: 2 });
    const later = item({ name: "crackers", est_kg: 50, shelf_life_days: 90 });

    const report = checkFit({ items: [later, soon], agency: home });

    // The soonest-expiring item is handled first and takes the space.
    const first = report.results[0];
    expect(first.item.name).toBe("fresh bagels");
    expect(first.decision).toBe("accept");
    expect(first.accepted_kg).toBe(50);

    const second = report.results[1];
    expect(second.item.name).toBe("crackers");
    expect(second.decision).toBe("accept-part");
    expect(second.accepted_kg).toBe(10);
    expect(report.free_kg_after.dry).toBe(0);
  });

  it("counts each storage type on its own", () => {
    const home = agency({ free_kg: { fridge: 0, freezer: 100, dry: 100 } });
    const milk = item({ name: "milk", category: "dairy", storage: "fridge" });

    const report = checkFit({ items: [milk], agency: home });
    expect(report.results[0].decision).toBe("redirect");
    expect(report.results[0].accepted_kg).toBe(0);
  });
});

describe("checkFit time limit", () => {
  it("keeps only what the kitchen can plate before the expiry date", () => {
    // 3 days x 100 meals x 0.54 kg = 162 kg usable.
    const home = agency({
      meals_per_day: 100,
      free_kg: { fridge: 1000, freezer: 1000, dry: 1000 },
    });
    const lasagna = item({
      name: "lasagna trays",
      category: "prepared-hot",
      storage: "fridge",
      est_kg: 300,
      shelf_life_days: 3,
    });

    const report = checkFit({ items: [lasagna], agency: home });
    const result = report.results[0];

    expect(result.decision).toBe("accept-part");
    expect(result.accepted_kg).toBe(162);
    // The reason line shows the arithmetic a manager can check.
    expect(result.reason).toContain("162");
    expect(result.reason).toContain("3 days");
    expect(result.reason).toContain("100 meals per day");
  });

  it("uses the kg per meal value it is given", () => {
    const home = agency({
      meals_per_day: 10,
      free_kg: { fridge: 1000, freezer: 1000, dry: 1000 },
    });
    const report = checkFit({
      items: [item({ est_kg: 100, shelf_life_days: 1 })],
      agency: home,
      kgPerMeal: 2,
    });
    expect(report.results[0].accepted_kg).toBe(20);
  });
});

describe("checkFit diet flags", () => {
  it("rejects pork at a halal kitchen", () => {
    const home = agency({ diet_flags: ["halal-needed"] });
    const ham = item({ name: "ham sandwiches", category: "prepared-hot" });

    const report = checkFit({ items: [ham], agency: home });
    expect(report.results[0].decision).toBe("redirect");
    expect(report.results[0].accepted_kg).toBe(0);
    expect(report.results[0].reason).toContain("not halal");
  });

  it("accepts chicken at a halal kitchen", () => {
    const home = agency({ diet_flags: ["halal-needed"] });
    const chicken = item({ name: "roast chicken", category: "meat-fresh" });

    const report = checkFit({ items: [chicken], agency: home });
    expect(report.results[0].decision).toBe("accept");
  });

  it("rejects meat at a vegetarian kitchen", () => {
    const home = agency({ diet_flags: ["vegetarian-needed"] });
    const beef = item({ name: "ground beef", category: "meat-fresh" });

    expect(dietConflict(beef, home)).toBe("not vegetarian");
  });

  it("accepts bread at a vegetarian kitchen", () => {
    const home = agency({ diet_flags: ["vegetarian-needed"] });
    expect(dietConflict(item(), home)).toBeNull();
  });

  it("never redirects to an agency with the same diet clash", () => {
    const home = agency({ diet_flags: ["halal-needed"] });
    const alsoHalal = agency({
      id: "halal-two",
      name: "Second Halal Kitchen",
      diet_flags: ["halal-needed"],
      lat: 46.24,
      lon: -63.13,
    });
    const farButFine = agency({
      id: "any-diet",
      name: "Summerside Food Bank",
      town: "Summerside",
      lat: 46.3959,
      lon: -63.7877,
    });

    const report = checkFit({
      items: [item({ name: "bacon", category: "meat-fresh" })],
      agency: home,
      others: [alsoHalal, farButFine],
    });

    expect(report.results[0].redirect_to?.agency_id).toBe("any-diet");
  });
});

describe("checkFit redirects", () => {
  it("never redirects to the receiving agency itself", () => {
    const home = agency({ free_kg: { fridge: 0, freezer: 0, dry: 0 } });
    const report = checkFit({ items: [item()], agency: home, others: [home] });

    expect(report.results[0].redirect_to).toBeUndefined();
    expect(report.results[0].unplaced_kg).toBe(10);
  });

  it("needs free space of at least the redirected kg, not just some space", () => {
    const home = agency({ free_kg: { fridge: 0, freezer: 0, dry: 0 } });
    const tooSmall = agency({
      id: "near-small",
      name: "Near but Full",
      lat: 46.239,
      lon: -63.132,
      free_kg: { fridge: 0, freezer: 0, dry: 9 },
    });
    const bigEnough = agency({
      id: "far-big",
      name: "Far but Free",
      lat: 46.3959,
      lon: -63.7877,
      free_kg: { fridge: 0, freezer: 0, dry: 500 },
    });

    const report = checkFit({
      items: [item({ est_kg: 10 })],
      agency: home,
      others: [tooSmall, bigEnough],
    });

    expect(report.results[0].redirect_to?.agency_id).toBe("far-big");
  });

  it("picks the nearest agency that has room", () => {
    const home = agency({ free_kg: { fridge: 0, freezer: 0, dry: 0 } });
    const near = agency({
      id: "near",
      name: "Near Kitchen",
      lat: 46.24,
      lon: -63.14,
      free_kg: { fridge: 0, freezer: 0, dry: 500 },
    });
    const far = agency({
      id: "far",
      name: "Far Kitchen",
      lat: 46.7072,
      lon: -64.2283,
      free_kg: { fridge: 0, freezer: 0, dry: 500 },
    });

    const report = checkFit({
      items: [item()],
      agency: home,
      others: [far, near],
    });
    expect(report.results[0].redirect_to?.agency_id).toBe("near");
  });

  it("does not send two items to the same shelf twice", () => {
    const home = agency({ free_kg: { fridge: 0, freezer: 0, dry: 0 } });
    const near = agency({
      id: "near",
      name: "Near Kitchen",
      lat: 46.24,
      lon: -63.14,
      free_kg: { fridge: 0, freezer: 0, dry: 50 },
    });
    const far = agency({
      id: "far",
      name: "Far Kitchen",
      lat: 46.7072,
      lon: -64.2283,
      free_kg: { fridge: 0, freezer: 0, dry: 500 },
    });

    const report = checkFit({
      items: [
        item({ name: "first", est_kg: 40, shelf_life_days: 1 }),
        item({ name: "second", est_kg: 40, shelf_life_days: 2 }),
      ],
      agency: home,
      others: [near, far],
    });

    expect(report.results[0].redirect_to?.agency_id).toBe("near");
    // Near has 10 kg left, which is not enough for the second 40 kg.
    expect(report.results[1].redirect_to?.agency_id).toBe("far");
  });

  it("reports kg that no agency can take", () => {
    const home = agency({ free_kg: { fridge: 0, freezer: 0, dry: 0 } });
    const report = checkFit({ items: [item({ est_kg: 25 })], agency: home });

    expect(report.results[0].unplaced_kg).toBe(25);
    expect(report.results[0].reason).toContain("No agency");
  });
});

describe("checkFit totals", () => {
  it("adds up to the kg that was offered", () => {
    const home = agency({
      free_kg: { fridge: 5, freezer: 0, dry: 20 },
      meals_per_day: 50,
    });
    const near = agency({
      id: "near",
      name: "Near Kitchen",
      lat: 46.24,
      lon: -63.14,
      free_kg: { fridge: 200, freezer: 200, dry: 200 },
    });

    const report = checkFit({
      items: [
        item({ name: "bagels", est_kg: 30, storage: "dry" }),
        item({ name: "milk", category: "dairy", est_kg: 12, storage: "fridge" }),
      ],
      agency: home,
      others: [near],
    });

    const { offered_kg, accepted_kg, redirected_kg, unplaced_kg } =
      report.totals;
    expect(offered_kg).toBe(42);
    expect(accepted_kg + redirected_kg + unplaced_kg).toBeCloseTo(42, 2);
  });

  it("does not change the agency objects it is given", () => {
    const home = agency();
    const before = JSON.stringify(home);
    checkFit({ items: [item()], agency: home });
    expect(JSON.stringify(home)).toBe(before);
  });
});
