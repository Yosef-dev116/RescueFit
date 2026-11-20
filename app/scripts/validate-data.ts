/**
 * Check the JSON files in public/data against the data contract.
 *
 * Run it with: npm run validate:data
 *
 * Fahd runs this before he commits the mock files, and again after he
 * replaces them with the real values. A file that fails here will silently
 * fall back to Yosef's dev fixtures in the running app, so the numbers on
 * the impact page would not match the numbers on the fit page.
 */

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

import {
  AgenciesSchema,
  ForecastSchema,
  ImpactFactorsSchema,
  ScenarioResultsSchema,
  ShelfLifeTableSchema,
} from "../lib/schemas";

const DATA_DIR = path.join(process.cwd(), "public", "data");

const FILES: { name: string; schema: z.ZodType; required: boolean }[] = [
  { name: "agencies.json", schema: AgenciesSchema, required: true },
  { name: "shelf_life.json", schema: ShelfLifeTableSchema, required: true },
  { name: "impact_factors.json", schema: ImpactFactorsSchema, required: true },
  {
    name: "scenario_results.json",
    schema: ScenarioResultsSchema,
    required: true,
  },
  { name: "forecast.json", schema: ForecastSchema, required: false },
];

let failures = 0;
let missing = 0;

for (const file of FILES) {
  const full = path.join(DATA_DIR, file.name);

  if (!fs.existsSync(full)) {
    if (file.required) {
      console.error(`MISSING  ${file.name}`);
      missing += 1;
    } else {
      console.warn(`skipped  ${file.name} (optional, not written yet)`);
    }
    continue;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(full, "utf8")) as unknown;
  } catch (error) {
    console.error(
      `BAD JSON ${file.name}: ${error instanceof Error ? error.message : error}`,
    );
    failures += 1;
    continue;
  }

  const parsed = file.schema.safeParse(raw);
  if (parsed.success) {
    console.log(`ok       ${file.name}`);
    continue;
  }

  failures += 1;
  console.error(`FAILED   ${file.name}`);
  for (const issue of parsed.error.issues.slice(0, 8)) {
    const where = issue.path.length > 0 ? issue.path.join(".") : "root";
    console.error(`           ${where}: ${issue.message}`);
  }
  if (parsed.error.issues.length > 8) {
    console.error(`           and ${parsed.error.issues.length - 8} more`);
  }
}

console.log("");
if (failures === 0 && missing === 0) {
  console.log("All data files match the contract in TEAM_PLAN.md section 6.");
  process.exit(0);
}
console.error(`${failures} file(s) failed, ${missing} required file(s) missing.`);
process.exit(1);
