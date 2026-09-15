/**
 * End-to-end smoke test: drives the full product flow in a real browser and
 * captures the screenshots used in the README.
 *
 *   npm run build && npm start &        # serve on :3000
 *   node scripts/smoke.mjs              # run the flow
 *
 * Env: BASE_URL (default http://localhost:3000), CHROMIUM_PATH (optional
 * explicit browser binary, e.g. in CI images without downloaded browsers).
 */

import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOTS = new URL("../docs/screenshots", import.meta.url).pathname;
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);

const log = (m) => console.log("✔", m);
const shot = async (name, fullPage = false) => {
  await page.waitForTimeout(900); // let entry animations settle
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });
  log(`screenshot ${name}`);
};

// 1. Landing
await page.goto(`${BASE}/`);
await page.waitForSelector("text=Every year, small nonprofits");
await shot("01-landing");
await shot("01b-landing-full", true);

// 2. Onboarding → demo org
await page.goto(`${BASE}/onboarding`);
await page.click("text=Or load the demo organization");
await page.waitForFunction(() =>
  document.querySelector("input")?.value?.includes("Brightpath"),
);
log("demo org loaded into form");
await shot("02-onboarding");
await page.click("text=Save & find grants");
await page.waitForURL("**/discover");
log("saved org, redirected to discover");

// 3. Discover — live Grants.gov results
await page.waitForSelector("article", { timeout: 45000 });
const cards = await page.locator("article").count();
log(`discover shows ${cards} grant cards`);
const liveBadge = await page.locator("text=Live ·").count();
log(`live badge present: ${liveBadge > 0}`);

// Analyze the featured grant (heuristic engine when no API key is set)
const featured = page.locator("article", { hasText: "Featured demo opportunity" }).first();
if ((await featured.count()) > 0) {
  await featured.locator("text=Analyze fit").click();
} else {
  console.log("! featured grant not in results; analyzing first card");
  await page.locator("article").first().locator("text=Analyze fit").click();
}
await page.waitForSelector("text=engine", { timeout: 120000 });
log("fit analysis rendered");
await shot("03-discover", true);

// Save to pipeline
await page.locator("text=+ Save to pipeline").first().click();
log("saved to pipeline");

// 4. Workspace for the featured demo grant
await page.goto(`${BASE}/grants/363637`);
await page.waitForSelector("text=Second Chance Act");
await page.waitForSelector("text=Go/no-go brief");
// The brief may already be present if this grant was analyzed on Discover.
if ((await page.locator("text=Why it fits").count()) === 0) {
  await page.click("text=Run the Analyst");
}
await page.waitForSelector("text=Why it fits", { timeout: 120000 });
log("workspace fit brief rendered");
await shot("04-workspace-brief", true);

// 5. Draft pipeline (demo replay without a key; live agents with one)
const launchButton = page
  .locator("button", { hasText: /Start drafting with Claude|Watch the pipeline/ })
  .first();
await launchButton.click();
await page.waitForSelector("text=Strategist's read on this funder", { timeout: 120000 });
await shot("05-agents-working");
await page.waitForSelector("text=Drafting complete", { timeout: 600000 });
log("draft pipeline completed");
await page.waitForSelector("text=Review panel verdict");
await shot("06-draft-review");
await shot("06b-draft-full", true);

const revised = await page.locator("text=view original").count();
log(`revision before/after toggle present: ${revised > 0}`);
const dl = await page.locator("text=Download .md").count();
log(`export available: ${dl > 0}`);

// 6. Pipeline tracker
await page.goto(`${BASE}/pipeline`);
await page.waitForSelector("text=Your pipeline");
await page.waitForSelector("text=Draft ready", { timeout: 15000 });
await shot("07-pipeline");

await browser.close();
console.log("SMOKE TEST PASSED");
