/**
 * Prove the behaviour the screenshots cannot show.
 *
 * A capture shows that a line is painted. It cannot show that the line
 * tears open in place, or that the attachment box really posts. Both are
 * promises this prototype makes, so both get a gate.
 *
 * Run it against a server that is already up:
 *
 *   npm run build && npx next start -p 3000
 *   npm run smoke:ui
 *
 * Set RF_BASE to test another address. This works in demo mode, so it
 * needs no API key.
 */
import { chromium } from "@playwright/test";

const BASE = process.env.RF_BASE ?? "http://localhost:3000";

let failures = 0;
function check(label, pass, detail = "") {
  if (pass) {
    console.log(`ok    ${label}${detail ? `  ${detail}` : ""}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${label}${detail ? `  ${detail}` : ""}`);
  }
}

try {
  await fetch(BASE);
} catch {
  console.error(
    `Nothing is listening on ${BASE}.\n\n` +
      "Start the app first:\n" +
      "  npm run build && npx next start -p 3000\n\n" +
      "Then run this again. Set RF_BASE to test a different address.",
  );
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForLoadState("load").catch(() => {});
await page.waitForTimeout(1200);

// 1. The signature interaction. One object carries summary and detail, so
//    the line must open where it sits and never navigate away.
const rows = page.locator("button[aria-expanded]");
const lineCount = await rows.count();
check("the waybill has lines", lineCount > 0, `${lineCount} lines`);

const first = rows.first();
const urlBefore = page.url();
check(
  "a line starts closed",
  (await first.getAttribute("aria-expanded")) === "false",
);

await first.click();
await page.waitForTimeout(400);

check(
  "the line opens",
  (await first.getAttribute("aria-expanded")) === "true",
);
check("it opens in place, with no navigation", page.url() === urlBefore);
check(
  "the opened line shows its reason",
  await page.locator("text=Reason").first().isVisible(),
);

// 2. A redirected line has to name where the food goes. A redirect
//    with no destination is the one failure a kitchen cannot act on.
let routed = false;
for (let i = 0; i < lineCount; i += 1) {
  const row = rows.nth(i);
  if ((await row.getAttribute("aria-expanded")) === "false") await row.click();
  await page.waitForTimeout(150);
  routed = await page
    .locator("text=Routed to")
    .first()
    .isVisible()
    .catch(() => false);
  if (routed) break;
}
check("a routed line names the agency it goes to", routed);

// 3. The primary action is a working control, not a link to somewhere else.
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(900);
await page.getByRole("button", { name: /use a sample message/i }).click();
await page.waitForTimeout(300);

const waitForPost = page.waitForResponse(
  (response) => response.url().includes("/api/intake"),
  { timeout: 40000 },
);
await page.getByRole("button", { name: /log this donation/i }).click();

const response = await waitForPost;
check("the attachment box posts the donation", response.status() === 200,
  `status ${response.status()}`);

const body = await response.json();
check("the reply carries items", (body.items ?? []).length > 0,
  `${(body.items ?? []).length} items, mode "${body.mode}"`);

await page.waitForTimeout(3000);
check(
  "logging a donation lands on the fit check",
  page.url().includes("/fit"),
  page.url(),
);

check("no console errors", errors.length === 0, errors.join(" | "));

await browser.close();

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nEvery behaviour check passed.");
