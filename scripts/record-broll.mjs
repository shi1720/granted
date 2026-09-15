/**
 * Records screen-capture b-roll of the full product flow, paced to the beats
 * in docs/demo-video-script.md, as a .webm the presenter can voice over
 * (or use as a timing reference while recording their own take).
 *
 *   npm run build && npm start &
 *   node scripts/record-broll.mjs        # → docs/video/broll-*.webm
 *
 * Env: BASE_URL, CHROMIUM_PATH (as in scripts/smoke.mjs).
 */

import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = new URL("../docs/video", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();
page.setDefaultTimeout(60000);
const beat = (ms) => page.waitForTimeout(ms);

// [0:00] The problem — landing
await page.goto(`${BASE}/`);
await page.waitForSelector("text=Every year, small nonprofits");
await beat(4000);
await page.mouse.wheel(0, 500);
await beat(2500); // live counter band
await page.mouse.wheel(0, 700);
await beat(2500); // the insight
await page.mouse.wheel(0, -1200);
await beat(1500);

// [0:35] Profile
await page.goto(`${BASE}/onboarding`);
await beat(1500);
await page.click("text=Fill with sample text");
await beat(2000);
// Use the demo org directly so the b-roll works with or without an API key.
await page.click("text=Or load the demo organization");
await beat(1200);
await page.mouse.wheel(0, 600);
await beat(2500); // show extracted profile fields
await page.mouse.wheel(0, 900);
await beat(1500);
await page.click("text=Save & find grants");
await page.waitForURL("**/discover");

// [1:05] Triage
await page.waitForSelector("article");
await beat(2500); // live results + badge
const featured = page.locator("article", { hasText: "Featured demo opportunity" }).first();
await featured.locator("text=Analyze fit").click();
await page.waitForSelector("text=Why it fits", { timeout: 120000 });
await beat(5000); // read the brief
await page.mouse.wheel(0, 400);
await beat(3000); // EV stat row
// the honest skip
const skip = page.locator("article", { hasText: "Smart Reentry" }).first();
if ((await skip.count()) > 0) {
  await skip.scrollIntoViewIfNeeded();
  await skip.locator("text=Analyze fit").click();
  await page.waitForSelector("text=Not eligible", { timeout: 120000 });
  await beat(5000); // let the skip verdict land
}
await featured.scrollIntoViewIfNeeded();
await featured.locator("text=+ Save to pipeline").click();
await beat(1000);

// [2:05] The drafting pipeline
await page.goto(`${BASE}/grants/363637`);
await page.waitForSelector("text=Go/no-go brief");
await beat(2500); // header: deadline, awards, eligibility pills
if ((await page.locator("text=Why it fits").count()) === 0) {
  await page.click("text=Run the Analyst");
  await page.waitForSelector("text=Why it fits", { timeout: 120000 });
}
await page.mouse.wheel(0, 500);
await beat(2000);
const launch = page
  .locator("button", { hasText: /Start drafting with Claude|Watch the pipeline/ })
  .first();
await launch.scrollIntoViewIfNeeded();
await launch.click();
await page.waitForSelector("text=Strategist's read on this funder", { timeout: 120000 });
await beat(4000); // strategist read
// follow the writer stream
await page.waitForSelector("text=Drafting complete", { timeout: 600000 });
await page.mouse.wheel(0, 600);
await beat(3000); // review panel + notes
// before/after toggle
const toggle = page.locator("text=view original").first();
if ((await toggle.count()) > 0) {
  await toggle.scrollIntoViewIfNeeded();
  await toggle.click();
  await beat(2500);
  await page.locator("text=Show revision").first().click();
  await beat(2000);
}
await page.mouse.wheel(0, -800);
await beat(2500); // score dials

// [3:50] Export + pipeline
await page.locator("text=Download .md").first().scrollIntoViewIfNeeded();
await beat(1500);
await page.goto(`${BASE}/pipeline`);
await page.waitForSelector("text=Your pipeline");
await beat(4000);

// [4:20] Close — back to landing
await page.goto(`${BASE}/`);
await beat(4000);

await context.close(); // flushes the video
await browser.close();

const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".webm"));
console.log("b-roll saved:", files.map((f) => `${OUT}/${f}`).join(", "));
