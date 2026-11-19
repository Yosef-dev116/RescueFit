import { z } from "zod";

/**
 * These schemas mirror the data contract in TEAM_PLAN.md section 6.
 * Fahd writes the JSON files. This app reads and validates them.
 * Change a schema here only after the team agrees to change the contract.
 */

export const STORAGE_TYPES = ["fridge", "freezer", "dry"] as const;
export type StorageType = (typeof STORAGE_TYPES)[number];
export const StorageTypeSchema = z.enum(STORAGE_TYPES);

/** kg per storage type. Used for both capacity_kg and free_kg. */
export const StorageKgSchema = z.object({
  fridge: z.number().min(0),
  freezer: z.number().min(0),
  dry: z.number().min(0),
});
export type StorageKg = z.infer<typeof StorageKgSchema>;

// ---------------------------------------------------------------- agencies

export const AgencySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  town: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  capacity_kg: StorageKgSchema,
  free_kg: StorageKgSchema,
  meals_per_day: z.number().min(0),
  diet_flags: z.array(z.string()).default([]),
});
export type Agency = z.infer<typeof AgencySchema>;
export const AgenciesSchema = z.array(AgencySchema).min(1);

// -------------------------------------------------------------- shelf life

export const ShelfLifeSchema = z.object({
  category: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  pantry_days: z.number().min(0),
  fridge_days: z.number().min(0),
  freezer_days: z.number().min(0),
});
export type ShelfLife = z.infer<typeof ShelfLifeSchema>;
export const ShelfLifeTableSchema = z.array(ShelfLifeSchema).min(1);

// ---------------------------------------------------------- impact factors

export const ImpactFactorsSchema = z.object({
  kg_per_meal: z.number().positive(),
  categories: z.record(
    z.string(),
    z.object({
      co2e_per_kg: z.number().min(0),
      cad_per_kg: z.number().min(0),
    }),
  ),
  sources: z.record(z.string(), z.string()).default({}),
});
export type ImpactFactors = z.infer<typeof ImpactFactorsSchema>;

// -------------------------------------------------------- scenario results

const ScenarioTotalsSchema = z.object({
  kg_received: z.number(),
  kg_wasted_at_agency: z.number(),
  meals: z.number(),
  co2e_kg: z.number(),
  cad: z.number(),
});

export const ScenarioResultsSchema = z.object({
  days: z.number().int().positive(),
  donors: z.number().int().min(0),
  agencies: z.number().int().min(0),
  baseline: ScenarioTotalsSchema,
  rescuefit: ScenarioTotalsSchema,
  daily: z.array(
    z.object({
      day: z.number().int().positive(),
      baseline_waste_kg: z.number(),
      rescuefit_waste_kg: z.number(),
    }),
  ),
  assumptions: z.array(z.string()).default([]),
});
export type ScenarioResults = z.infer<typeof ScenarioResultsSchema>;

// ---------------------------------------------------------------- forecast

export const ForecastDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  predicted_kg: z.number().min(0),
  low_kg: z.number().min(0),
  high_kg: z.number().min(0),
});
export type ForecastDay = z.infer<typeof ForecastDaySchema>;
export const ForecastSchema = z.array(ForecastDaySchema);

// ------------------------------------------------------------ intake items

export const UNITS = ["each", "kg", "tray", "loaf", "case", "bag", "L"] as const;

/**
 * The item shape the intake API returns. All three people use it.
 */
export const IntakeItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  qty: z.number().min(0),
  unit: z.string().min(1),
  est_kg: z.number().min(0),
  storage: StorageTypeSchema,
  shelf_life_days: z.number().min(0),
  confidence: z.number().min(0).max(1),
});
export type IntakeItem = z.infer<typeof IntakeItemSchema>;

export const IntakeResponseSchema = z.object({
  items: z.array(IntakeItemSchema),
});

/**
 * The loose schema we send to Claude.
 *
 * zodOutputFormat turns a zod bound such as .min(0).max(1) into a plain
 * description string, so the model is never forced to obey it. If we parsed
 * the reply with the strict schema above, one out-of-range confidence would
 * throw away the whole list. So we parse loose, then clamp and validate.
 */
export const LlmItemSchema = z.object({
  name: z.string(),
  category: z.string(),
  qty: z.number(),
  unit: z.string(),
  est_kg: z.number(),
  storage: z.string(),
  confidence: z.number(),
});
export type LlmItem = z.infer<typeof LlmItemSchema>;

export const LlmIntakeSchema = z.object({
  items: z.array(LlmItemSchema),
});

export const SPOILAGE_VERDICTS = ["fresh", "use-today", "compost"] as const;
export type SpoilageVerdict = (typeof SPOILAGE_VERDICTS)[number];

export const LlmSpoilageSchema = z.object({
  name: z.string(),
  verdict: z.string(),
  reason: z.string(),
  confidence: z.number(),
});

export const SpoilageResultSchema = z.object({
  name: z.string().min(1),
  verdict: z.enum(SPOILAGE_VERDICTS),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
});
export type SpoilageResult = z.infer<typeof SpoilageResultSchema>;

// ------------------------------------------------------------- menu plan

export const LlmPlanSchema = z.object({
  days: z.array(
    z.object({
      day: z.number(),
      date_label: z.string(),
      meals: z.array(
        z.object({
          name: z.string(),
          uses: z.array(z.string()),
          servings: z.number(),
          note: z.string(),
        }),
      ),
    }),
  ),
  prep_list: z.array(z.string()),
  waste_warning: z.string(),
});

export const PlanSchema = z.object({
  days: z
    .array(
      z.object({
        day: z.number().int().positive(),
        date_label: z.string(),
        meals: z.array(
          z.object({
            name: z.string().min(1),
            uses: z.array(z.string()),
            servings: z.number().min(0),
            note: z.string(),
          }),
        ),
      }),
    )
    .min(1),
  prep_list: z.array(z.string()),
  waste_warning: z.string(),
});
export type Plan = z.infer<typeof PlanSchema>;

// ------------------------------------------------------------------ shared

/** Every AI response says whether a real model answered it. */
export const MODES = ["demo", "live"] as const;
export type Mode = (typeof MODES)[number];
