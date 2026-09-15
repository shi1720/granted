# For Judges — evaluate Granted in 3 minutes

No accounts, no keys required. (With a key it's fully live; without one, every fallback is
honest and labeled.)

```bash
npm install && npm run dev     # http://localhost:3000
# optional full-live mode: cp .env.example .env.local + your ANTHROPIC_API_KEY
```

**The 3-minute path:**

1. **Landing** — note the live counter: that's the real number of open federal
   opportunities on Grants.gov at this moment.
2. **Open the app → "Load the demo organization" → Save & find grants.**
   Discover shows **live Grants.gov results** (see the "Live" badge — real deadlines,
   real award ceilings).
3. **Click "Analyze fit" on the featured Second Chance Act grant** → a go/no-go brief
   with an eligibility gate, effort estimate, and expected-value math shown.
4. **The honesty test:** analyze **"Smart Reentry Demonstration Program"** — a
   perfect-sounding mission fit that Granted tells you to **skip**, because the funder's
   eligible-applicant list excludes nonprofits. This is the product's core claim: it
   protects a small org's 40 hours, even from itself.
5. **Open the featured grant's workspace → start drafting** → watch
   Strategist → Writer → Reviewer → Reviser stream live: the funder-priority read, the
   grounded sections with `[ADD: …]` placeholders instead of invented data, the panel
   score, and the before/after revision (toggle "view original" on the revised section).
6. **Pipeline** — deadline-sorted board with combined expected value. Export the draft
   with **Download .md**.

**Where to look in the code (5 files tell the story):**

| File | What it shows |
|---|---|
| `lib/ai/draft.ts` | The multi-agent pipeline + chunk-safe stream parser |
| `lib/ai/schemas.ts` | Structured outputs for every judgment call |
| `lib/ai/prompts.ts` | The grounding/honesty contract each agent works under |
| `lib/fit.ts` | Deterministic economics + the transparent no-key fit engine |
| `scripts/smoke.mjs` | Playwright E2E that drives the whole journey (it caught a real bug) |

`npm test` runs 26 unit tests, including the stream parser fed one character at a time.
