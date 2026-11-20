// Prints PROTOTYPE_GUIDE.md to docs/Innovation_RescueFit_2_PrototypeGuide.pdf.
// Usage: npx -y marked -i PROTOTYPE_GUIDE.md -o /tmp/guide.html && node scripts/guide-pdf.mjs /tmp/guide.html
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const body = readFileSync(process.argv[2], "utf8");
const OUT = path.resolve("../docs/Innovation_RescueFit_2_PrototypeGuide.pdf");

const html = `<!doctype html><html><head><meta charset="utf-8">
<title>RescueFit prototype guide</title>
<style>
  body { font: 10.5pt/1.5 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1b1b18; }
  h1 { font-size: 22pt; margin: 0 0 4pt; color: #174635; }
  h2 { font-size: 14pt; margin: 18pt 0 6pt; color: #174635; break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 12pt 0 4pt; break-after: avoid; }
  hr { border: 0; border-top: 1px solid #cfc8b6; margin: 12pt 0; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 9.5pt; break-inside: avoid; }
  th, td { border: 1px solid #cfc8b6; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #efe9da; }
  code { font: 9pt "SF Mono", Menlo, monospace; background: #f3efe4; padding: 0 2pt; }
  pre { background: #f3efe4; padding: 8pt; font-size: 8.5pt; white-space: pre-wrap; break-inside: avoid; }
  pre code { background: none; padding: 0; }
  img { width: 100%; border: 1px solid #cfc8b6; margin: 6pt 0 2pt; break-inside: avoid; }
  p:has(> img) { break-inside: avoid; break-before: page; margin: 0; }
  a { color: #174635; }
  blockquote { margin: 6pt 0; padding-left: 10pt; border-left: 3px solid #cfc8b6; color: #444; }
</style></head><body>${body}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
const tmp = path.resolve(".guide-print.html");
writeFileSync(tmp, html);
await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
rmSync(tmp);
await page.pdf({
  path: OUT,
  format: "Letter",
  margin: { top: "0.7in", bottom: "0.7in", left: "0.75in", right: "0.75in" },
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="font:8pt Arial;color:#777;width:100%;text-align:center">RescueFit prototype guide · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
});
await browser.close();
console.log(OUT);
