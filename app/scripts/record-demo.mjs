// Records the 2-minute demo walkthrough of the live site, with captions.
import { chromium } from "@playwright/test";

const BASE = process.env.RF_BASE ?? "https://rescuefit-pei.vercel.app";
const OUT = process.env.RF_VIDEO_DIR ?? "/tmp/rf-video";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
const wait = (ms) => page.waitForTimeout(ms);

async function caption(text) {
  await page.evaluate((t) => {
    let el = document.getElementById("rf-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "rf-caption";
      Object.assign(el.style, {
        position: "fixed", left: "50%", bottom: "28px", transform: "translateX(-50%)",
        maxWidth: "1000px", padding: "14px 22px", background: "rgba(20,20,18,0.88)",
        color: "#fff", font: "500 22px/1.35 system-ui, sans-serif", borderRadius: "6px",
        zIndex: "2147483647", textAlign: "center", pointerEvents: "none",
      });
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}

async function scrollTo(y, ms = 1500) {
  await page.evaluate(([y, ms]) => {
    const start = window.scrollY, d = y - start, t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      window.scrollTo(0, start + d * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [y, ms]);
  await wait(ms + 200);
}

async function go(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("load").catch(() => {});
  await wait(1200);
}

// 1. Home
await go("/");
await caption("RescueFit: a donated delivery arrives at a PEI food bank. Can this kitchen store it and use it in time?");
await wait(7000);
await caption("The answer is checked before the kitchen accepts the food, not after it expires.");
await scrollTo(500);
await wait(4000);

// 2. Intake
await scrollTo(0, 800);
await caption("Step 1, intake: take a photo or paste the donor's message. Here we use a sample message.");
await page.getByRole("button", { name: /use a sample message/i }).click();
await wait(4500);
await caption("The AI turns the message into an item list: name, weight, storage type and shelf life.");
const posted = page.waitForResponse((r) => r.url().includes("/api/intake"), { timeout: 40000 });
await page.getByRole("button", { name: /log this donation/i }).click();
await posted;
await page.waitForURL(/\/fit/, { timeout: 20000 });
await page.waitForLoadState("load").catch(() => {});
await wait(1500);

// 3. Fit
await caption("Step 2, fit check: plain arithmetic, no AI. Free fridge, freezer and dry space for this kitchen.");
await wait(7000);
await scrollTo(240, 2000);
await caption("Each item gets Accept, Accept part, or Redirect, with a one-line reason.");
await wait(6000);
const row = page.locator("button[aria-expanded]").first();
if (await row.isVisible().catch(() => false)) {
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await caption("Open a line to see why. Surplus is routed to a nearby agency that has the space and can use it.");
  await wait(7000);
}

// 4. Plan
await go("/plan");
await caption("Step 3, use-first plan: the kept food, soonest expiry first, turned into a 3-day menu and prep list.");
await wait(8000);
await scrollTo(600, 2500);
await wait(6000);

// 5. Network
await go("/network");
await caption("The network: PEI agencies with free space, on a map. Redirects only go where food fits.");
await wait(6000);
await scrollTo(560, 2000);
await wait(5000);

// 6. Impact
await go("/impact");
await caption("Impact, from a 30-day simulation with 81 donors and 22 kitchens. Modelled, not measured.");
await wait(5000);
await scrollTo(300, 1800);
await caption("722 kg less food expired at kitchens, 349 kg more food used, and 641 extra meals.");
await wait(7000);
await scrollTo(560, 1800);
await caption("Wasted food per day: today's network in red, with RescueFit in green.");
await wait(6000);

// 7. Impact lab
await go("/rescuefit/index.html#impact");
await caption("The impact lab: run the simulation yourself, compare the policies, and export the results.");
await wait(9000);

// 8. End
await go("/");
await caption("RescueFit. Live at rescuefit-pei.vercel.app. IMPAC 2026, Innovation stream.");
await wait(5000);

const video = page.video();
await context.close();
console.log(await video.path());
await browser.close();
