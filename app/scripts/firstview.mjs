// The first viewport only. No scrolling, no full page.
//
// The direction contract has a FIRST VIEWPORT block, and it is a claim about
// what a visitor sees before they scroll. A full-page capture cannot test it,
// because it shows the whole document at once.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.RF_BASE ?? "http://localhost:3000";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

// Add a route here when its first viewport makes a promise worth checking.
const ROUTES = [["home", "/"]];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
const page = await context.newPage();

for (const [name, route] of ROUTES) {
  await page.goto(`${BASE}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${OUT}/${name}-firstviewport.png` });
  console.log(`wrote ${OUT}/${name}-firstviewport.png`);
}

await context.close();
await browser.close();
