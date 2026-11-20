/**
 * Prove the live Claude path works, and print what it costs.
 *
 * Run it once after you put a real key in app/.env.local:
 *
 *   cd app && npm run smoke:live
 *
 * It needs the dev server running in another terminal (npm run dev).
 *
 * The development machine this app was built on had no credentials, so
 * every AI route has only ever run in demo mode. This script is the gate
 * that turns that into a measured fact. It fails loudly when a route
 * answers with mode "demo", because a demo answer proves nothing.
 *
 * It also prints the cost per photo, which task Y7 asks Yosef to send to
 * Rama for the report.
 */

const BASE = process.env.RF_BASE ?? "http://localhost:3000";

type Usage = { input_tokens: number; output_tokens: number; usd_cost: number };

let failures = 0;
const costs: { label: string; usage: Usage }[] = [];

/** A tiny valid JPEG, so the image path runs without a real photo on disk. */
const TINY_JPEG =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
  "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA" +
  "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

async function post(path: string, body: unknown) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, data };
}

function report(label: string, result: { ok: boolean; status: number; data: Record<string, unknown> }) {
  if (!result.ok) {
    failures += 1;
    console.error(`FAIL  ${label}: ${result.status} ${String(result.data.error ?? "")}`);
    return false;
  }
  if (result.data.mode !== "live") {
    failures += 1;
    console.error(
      `FAIL  ${label}: the route answered in mode "${String(result.data.mode)}". ` +
        "Set ANTHROPIC_API_KEY in app/.env.local and restart the dev server.",
    );
    return false;
  }

  const usage = result.data.usage as Usage | undefined;
  if (usage) {
    costs.push({ label, usage });
    console.log(
      `ok    ${label}  model=${String(result.data.model)}  ` +
        `in=${usage.input_tokens} out=${usage.output_tokens} ` +
        `USD=${usage.usd_cost.toFixed(5)}`,
    );
  } else {
    console.log(`ok    ${label}  (no usage reported)`);
  }
  return true;
}

/**
 * Fail with an instruction, not a stack trace.
 *
 * Without this, a server that is not running throws ECONNREFUSED out of the
 * first fetch and node prints its own stack. The operator then has to read a
 * stack to learn that they forgot to start the dev server.
 */
async function requireServer(): Promise<void> {
  try {
    await fetch(BASE, { method: "GET" });
  } catch {
    console.error(
      `Nothing is listening on ${BASE}.\n\n` +
        "Start the app in another terminal first:\n" +
        "  cd app && npm run dev\n\n" +
        "Then run this again. Set RF_BASE to test a different address.",
    );
    process.exit(1);
  }
}

console.log(`Smoke testing the live model path against ${BASE}\n`);

await requireServer();

// 1. Text intake (feature X4).
const text = await post("/api/intake", {
  text: "40 ham and cheese sandwiches, 2 trays of lasagna, 15 loaves of bread",
});
if (report("text intake ", text)) {
  const items = (text.data.items ?? []) as unknown[];
  console.log(`      read ${items.length} items`);
  if (items.length === 0) {
    failures += 1;
    console.error("FAIL  text intake returned no items.");
  }
}

// 2. Photo intake (feature C1). A 1x1 JPEG holds no food, so an empty list
//    is the correct answer here. We are testing the path, not the vision.
const photo = await post("/api/intake", {
  image: TINY_JPEG,
  media_type: "image/jpeg",
});
report("photo intake", photo);
console.log(
  "      note: the test image is 1x1, so an empty item list is correct.\n" +
    "      Point a real photo at /intake in the browser to judge accuracy.",
);

// 3. The use-first plan (feature C4).
const plan = await post("/api/plan", {
  meals_per_day: 150,
  kitchen: "Upper Room Food Bank",
  items: [
    {
      name: "lasagna trays",
      category: "prepared-hot",
      qty: 4,
      unit: "tray",
      est_kg: 16,
      storage: "fridge",
      shelf_life_days: 3,
      confidence: 0.84,
    },
    {
      name: "bagels",
      category: "bread",
      qty: 36,
      unit: "each",
      est_kg: 3.6,
      storage: "dry",
      shelf_life_days: 5,
      confidence: 0.91,
    },
  ],
});
if (report("menu plan  ", plan)) {
  const days = ((plan.data.plan as { days?: unknown[] })?.days ?? []).length;
  console.log(`      wrote ${days} days`);
}

// 4. The spoilage check (feature X3). This route also calls the model, so a
//    gate that skipped it would report "live" while one AI path stayed
//    unproven. The 1x1 JPEG holds no produce, so any of the three verdicts
//    is a pass here. We are testing the path, not the judgement.
const spoilage = await post("/api/spoilage", {
  image: TINY_JPEG,
  media_type: "image/jpeg",
});
if (report("spoilage   ", spoilage)) {
  const verdict = (spoilage.data.result as { verdict?: string })?.verdict;
  console.log(`      verdict "${String(verdict)}"`);
}

// The number Yosef owes Rama for the report.
console.log("");
if (costs.length > 0) {
  const total = costs.reduce((sum, entry) => sum + entry.usage.usd_cost, 0);
  const perPhoto = costs.find((entry) => entry.label.includes("photo"));
  console.log(`Total for this run: USD ${total.toFixed(5)}`);
  if (perPhoto) {
    console.log(
      `Cost per photo: USD ${perPhoto.usage.usd_cost.toFixed(5)}. ` +
        "A real photo costs more, because 1568 px of image is about 1600 tokens.",
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nEvery live route answered in mode \"live\".");

export {};
