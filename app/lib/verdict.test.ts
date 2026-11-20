import { describe, expect, it } from "vitest";

import { storageFor } from "./intake";
import { readVerdict } from "./verdict";

describe("readVerdict", () => {
  it.each(["fresh", "Fresh", "FRESH", "good", "Fresh."])("reads %s as fresh", (raw) => {
    expect(readVerdict(raw)).toBe("fresh");
  });

  it.each([
    "not fresh",
    "Use today (not fresh)",
    "isn't fresh",
    "no longer fresh",
    "mostly fresh",
    "fresh but bruised",
    "good, use soon",
    "use_today",
    "Use Today",
    "unclear",
    "",
  ])("never reads %j as fresh", (raw) => {
    expect(readVerdict(raw)).toBe("use-today");
  });

  it.each(["compost", "Compost it", "discard"])("reads %s as compost", (raw) => {
    expect(readVerdict(raw)).toBe("compost");
  });
});

describe("storageFor", () => {
  const dairy = { pantry_days: 0, fridge_days: 10, freezer_days: 90 };
  const bread = { pantry_days: 5, fridge_days: 10, freezer_days: 90 };
  const noFridge = { pantry_days: 0, fridge_days: 0, freezer_days: 60 };

  it("puts milk in the fridge, not in dry storage", () => {
    expect(storageFor(dairy, "Dairies, Milks, Whole milks")).toBe("fridge");
  });

  it("follows a frozen hint in the product text", () => {
    expect(storageFor(dairy, "Frozen foods, Ice creams")).toBe("freezer");
  });

  it("keeps shelf-stable food dry", () => {
    expect(storageFor(bread, "Breads")).toBe("dry");
  });

  it("uses the freezer when there is no pantry or fridge life", () => {
    expect(storageFor(noFridge, "")).toBe("freezer");
  });
});
