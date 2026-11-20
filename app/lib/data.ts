import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

import {
  AgenciesSchema,
  ForecastSchema,
  ImpactFactorsSchema,
  ScenarioResultsSchema,
  ShelfLifeTableSchema,
  type Agency,
  type ForecastDay,
  type ImpactFactors,
  type ScenarioResults,
  type ShelfLife,
} from "./schemas";

import agenciesFixture from "./fixtures/agencies.json";
import forecastFixture from "./fixtures/forecast.json";
import impactFactorsFixture from "./fixtures/impact_factors.json";
import scenarioResultsFixture from "./fixtures/scenario_results.json";
import shelfLifeFixture from "./fixtures/shelf_life.json";

/**
 * Server-side reads of the shared data files.
 *
 * Fahd writes the real JSON in public/data. This module reads it with fs and
 * validates it against the contract in TEAM_PLAN.md section 6. When a file is
 * missing or invalid, it falls back to the dev fixtures in lib/fixtures.
 *
 * The fixtures are static imports, not fs reads. That way the fallback can
 * never fail because of a missing file in a serverless bundle.
 *
 * Every result reports its source. A silent fallback would hide a contract
 * mismatch between the fit page and the impact numbers.
 */

export type DataSource = "data" | "fixture";

export type Loaded<T> = {
  value: T;
  source: DataSource;
  /**
   * Set when the real file was missing or failed validation.
   *
   * This names a path and is written for a developer, so it goes to the
   * server log only. Use clientWarning() for anything sent to a browser.
   */
  warning?: string;
};

/**
 * What a public caller is told when a data file is missing.
 *
 * The developer warning names public/data paths and a teammate. The app is
 * public, so the browser gets the fact without the file system detail.
 */
export function clientWarning(loaded: Loaded<unknown>): string | null {
  if (loaded.source === "data") return null;
  return "Some shared data is not published yet, so these numbers come from sample data.";
}

const DATA_DIR = path.join(process.cwd(), "public", "data");

function readJsonFile(fileName: string): unknown {
  const full = path.join(DATA_DIR, fileName);
  const text = fs.readFileSync(full, "utf8");
  return JSON.parse(text) as unknown;
}

/** Turn a zod error into one short line that a developer can act on. */
function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "unknown validation error";
  const where = issue.path.length > 0 ? issue.path.join(".") : "root";
  return `${where}: ${issue.message}`;
}

function load<T>(
  fileName: string,
  schema: z.ZodType<T>,
  fixture: unknown,
): Loaded<T> {
  let raw: unknown;
  try {
    raw = readJsonFile(fileName);
  } catch {
    return {
      value: schema.parse(fixture),
      source: "fixture",
      warning: `public/data/${fileName} is missing. Using Yosef's dev fixture.`,
    };
  }

  const parsed = schema.safeParse(raw);
  if (parsed.success) {
    return { value: parsed.data, source: "data" };
  }

  return {
    value: schema.parse(fixture),
    source: "fixture",
    warning:
      `public/data/${fileName} does not match the contract ` +
      `(${firstIssue(parsed.error)}). Using Yosef's dev fixture.`,
  };
}

export function loadAgencies(): Loaded<Agency[]> {
  return load("agencies.json", AgenciesSchema, agenciesFixture);
}

export function loadShelfLife(): Loaded<ShelfLife[]> {
  return load("shelf_life.json", ShelfLifeTableSchema, shelfLifeFixture);
}

export function loadImpactFactors(): Loaded<ImpactFactors> {
  return load("impact_factors.json", ImpactFactorsSchema, impactFactorsFixture);
}

export function loadScenarioResults(): Loaded<ScenarioResults> {
  return load(
    "scenario_results.json",
    ScenarioResultsSchema,
    scenarioResultsFixture,
  );
}

export function loadForecast(): Loaded<ForecastDay[]> {
  return load("forecast.json", ForecastSchema, forecastFixture);
}

// ----------------------------------------------------------- shelf life map

/**
 * Pick the shelf life row for a category or an item name.
 *
 * It tries the category name first, then a keyword match on the item name.
 * It falls back to the "other" row, or to the last row in the table.
 */
export function findShelfLife(
  table: ShelfLife[],
  category: string,
  name = "",
): ShelfLife {
  const needle = `${category} ${name}`.toLowerCase();

  const byCategory = table.find(
    (row) => row.category.toLowerCase() === category.toLowerCase(),
  );
  if (byCategory) return byCategory;

  const byKeyword = table.find((row) =>
    row.keywords.some((word) => needle.includes(word.toLowerCase())),
  );
  if (byKeyword) return byKeyword;

  return (
    table.find((row) => row.category === "other") ?? table[table.length - 1]
  );
}

/** Days this item lasts in the storage type we plan to put it in. */
export function shelfLifeDays(row: ShelfLife, storage: string): number {
  if (storage === "freezer") return row.freezer_days;
  if (storage === "fridge") return row.fridge_days;
  return row.pantry_days;
}
