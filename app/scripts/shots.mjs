// Batched screenshot round. One browser, every viewport, one trip.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.RF_BASE ?? "http://localhost:3000";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ["home", "/"],
  ["intake", "/intake"],
  ["fit", "/fit"],
  ["plan", "/plan"],
  ["network", "/network"],
  ["impact", "/impact"],
];

const VIEWPORTS = [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
];

const browser = await chromium.launch();
const problems = [];

for (const [vpName, width, height] of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    reducedMotion: "reduce", // settle entrance motion before capture
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`${vpName} console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`${vpName} pageerror: ${err.message}`));

  for (const [name, route] of ROUTES) {
    // /plan fetches its menu after mount, so networkidle can hang.
    const response = await page.goto(`${BASE}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForLoadState("load").catch(() => {});
    if (!response || !response.ok()) {
      problems.push(`${route} returned ${response ? response.status() : "no response"}`);
    }
    await page.waitForTimeout(1800);
    await page.evaluate(() => window.scrollTo(0, 0));
    const suffix = vpName === "desktop" ? "" : `-${vpName}`;
    await page.screenshot({
      path: `${OUT}/${name}${suffix}.png`,
      fullPage: true,
    });
  }
  await context.close();
}

await browser.close();

if (problems.length > 0) {
  console.log("PROBLEMS:");
  for (const problem of problems) console.log(" -", problem);
} else {
  console.log("No console errors, no bad responses.");
}
