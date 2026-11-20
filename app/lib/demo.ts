import type { LlmItem } from "./schemas";

/**
 * Canned replies for demo mode.
 *
 * This machine has no Anthropic credentials, so the demo path keeps the whole
 * flow clickable: intake, fit, plan. Every response that uses one of these is
 * tagged mode "demo". Fahd's accuracy script (task F6) must reject that tag.
 */

/**
 * A plausible catered-event pickup.
 *
 * This donation is chosen to exercise every rule the fit engine has, so
 * the landing page demonstrates the product instead of describing it. At
 * the Upper Room, which keeps halal and has 80 kg of fridge and 40 kg of
 * freezer free, it produces a diet redirect, two space-limited partial
 * accepts, a cascade onto a second agency when the first one fills, and
 * plain accepts. A donation that simply fits would prove nothing.
 */
export const DEMO_PHOTO_ITEMS: LlmItem[] = [
  {
    name: "ham and cheese sandwiches",
    category: "prepared-hot",
    qty: 120,
    unit: "each",
    est_kg: 24,
    storage: "fridge",
    confidence: 0.89,
  },
  {
    name: "lasagna trays",
    category: "prepared-hot",
    qty: 12,
    unit: "tray",
    est_kg: 48,
    storage: "fridge",
    confidence: 0.84,
  },
  {
    name: "mixed salad greens",
    category: "produce-leafy",
    qty: 20,
    unit: "bag",
    est_kg: 6,
    storage: "fridge",
    confidence: 0.77,
  },
  {
    name: "whole milk",
    category: "dairy",
    qty: 40,
    unit: "L",
    est_kg: 41,
    storage: "fridge",
    confidence: 0.88,
  },
  {
    name: "frozen chicken breast",
    category: "meat-fresh",
    qty: 55,
    unit: "kg",
    est_kg: 55,
    storage: "freezer",
    confidence: 0.82,
  },
  {
    name: "bagels",
    category: "bread",
    qty: 36,
    unit: "each",
    est_kg: 3.6,
    storage: "dry",
    confidence: 0.91,
  },
];

/** The sample donor text message on the intake page. */
export const DEMO_TEXT_MESSAGE =
  "Hi, this is the kitchen at the Delta. We have 40 ham and cheese " +
  "sandwiches, 2 full trays of lasagna, about 15 loaves of bread from " +
  "yesterday, and a case of bananas that are going brown. Can anyone take " +
  "it before 6?";

/** What demo mode returns for that message. */
export const DEMO_TEXT_ITEMS: LlmItem[] = [
  {
    name: "ham and cheese sandwiches",
    category: "prepared-hot",
    qty: 40,
    unit: "each",
    est_kg: 8,
    storage: "fridge",
    confidence: 0.93,
  },
  {
    name: "lasagna trays",
    category: "prepared-hot",
    qty: 2,
    unit: "tray",
    est_kg: 8,
    storage: "fridge",
    confidence: 0.9,
  },
  {
    name: "day-old bread loaves",
    category: "bread",
    qty: 15,
    unit: "loaf",
    est_kg: 9,
    storage: "dry",
    confidence: 0.86,
  },
  {
    name: "ripe bananas",
    category: "produce-soft",
    qty: 1,
    unit: "case",
    est_kg: 12,
    storage: "dry",
    confidence: 0.81,
  },
];

export const DEMO_SPOILAGE = {
  name: "bananas",
  verdict: "use-today",
  reason:
    "The skins are brown and spotted, and the fruit is soft. It is still " +
    "safe, so use it today in baking or smoothies.",
  confidence: 0.79,
};

/** A 3-day plan that uses the soonest-expiring items first. */
export const DEMO_PLAN = {
  days: [
    {
      day: 1,
      date_label: "Today",
      meals: [
        {
          name: "Garden salad with warm bagel",
          uses: ["mixed salad greens", "bagels"],
          servings: 60,
          note: "The greens expire first. Serve all of them today.",
        },
        {
          name: "Baked lasagna with side salad",
          uses: ["lasagna trays", "mixed salad greens"],
          servings: 90,
          note: "Reheat two trays to 74 C. Keep the other two cold.",
        },
      ],
    },
    {
      day: 2,
      date_label: "Tomorrow",
      meals: [
        {
          name: "Lasagna and milk service",
          uses: ["lasagna trays", "whole milk"],
          servings: 90,
          note: "Last day for the lasagna. Freeze any tray you cannot serve.",
        },
        {
          name: "Bagel breakfast with milk",
          uses: ["bagels", "whole milk"],
          servings: 60,
          note: "Milk has 8 days left, so there is no rush on it.",
        },
      ],
    },
    {
      day: 3,
      date_label: "Day 3",
      meals: [
        {
          name: "Chicken and rice bowls",
          uses: ["frozen chicken breast"],
          servings: 100,
          note: "Move 5 kg of chicken to the fridge tonight to thaw.",
        },
        {
          name: "Bagel sandwiches",
          uses: ["bagels", "whole milk"],
          servings: 50,
          note: "Use the last bagels before they go stale on day 5.",
        },
      ],
    },
  ],
  prep_list: [
    "Label every container with the date it came in.",
    "Move 5 kg of frozen chicken to the fridge on day 2 to thaw safely.",
    "Wash and spin the salad greens now. They last one day longer dry.",
    "Portion the lasagna into 90 servings before you reheat it.",
    "Freeze any lasagna tray you cannot serve by the end of day 2.",
  ],
  waste_warning:
    "The salad greens expire first and are the only item at real risk. " +
    "Serve all 2.4 kg on day 1.",
};
