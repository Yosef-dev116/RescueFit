import { describe, expect, it } from "vitest";

import { checkFit } from "./fit";
import { loadAgencies, loadImpactFactors } from "./data";
import { sampleConsignment } from "./sample";

/*
 * The worked example printed in PROTOTYPE_GUIDE.md section 3.
 *
 * That section tells a judge the numbers on the landing page add up by
 * hand. If the demo data or the engine changes and nobody reruns the
 * arithmetic, the guide becomes a false claim in a submitted document.
 * This test fails instead.
 */

describe("the worked example in the prototype guide", () => {
  const agencies = loadAgencies().value;
  const factors = loadImpactFactors().value;
  const home = agencies[0];
  const report = checkFit({
    items: sampleConsignment(),
    agency: home,
    others: agencies.slice(1),
    kgPerMeal: factors.kg_per_meal,
  });

  it("offers 177.6 kg, keeps 123.6 kg, and routes 54 kg", () => {
    expect(report.totals.offered_kg).toBe(177.6);
    expect(report.totals.accepted_kg).toBe(123.6);
    expect(report.totals.redirected_kg).toBe(54);
  });

  it("keeps plus routes equals offered, with nothing unplaced", () => {
    expect(report.totals.accepted_kg + report.totals.redirected_kg).toBe(
      report.totals.offered_kg,
    );
    expect(report.totals.unplaced_kg).toBe(0);
  });

  it("sends something onward on 3 of the 6 lines", () => {
    const routed = report.results.filter((r) => r.redirected_kg > 0);
    expect(report.results).toHaveLength(6);
    expect(routed).toHaveLength(3);
  });

  it("fills the fridge to exactly its free space, which is why milk is partial", () => {
    const fridge = report.results.filter((r) => r.item.storage === "fridge");
    const kept = fridge.reduce((sum, r) => sum + r.accepted_kg, 0);

    expect(home.free_kg.fridge).toBe(80);
    expect(Math.round(kept * 10) / 10).toBe(80);

    const milk = report.results.find((r) => r.item.name.includes("milk"));
    expect(milk?.decision).toBe("accept-part");
  });
});
