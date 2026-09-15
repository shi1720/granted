# Devpost Submission Copy — Granted

> Paste-ready content for the submission form. Tagline ≤ 60 chars options first.

## Project name

**Granted — the AI grants team for small nonprofits**

## Tagline options

- *Find the grants you can win. Skip the ones you can't. Draft in minutes.*
- *An AI grants team for the 1.8M nonprofits that can't afford one.*

## Inspiration

Every small-nonprofit founder we know has the same story: they hear about a "perfect"
federal grant, burn a month of nights on the application, and lose — or worse, discover
after submitting that they were never eligible. Professional grant writers charge $80–150
an hour; a single federal application takes 40+ hours. The organizations doing the hardest
community work are locked out of money that exists specifically for them, while hundreds
of opportunities sit open on Grants.gov at any moment.

The unlock was realizing the industry builds writing tools, but nonprofits mostly lose at
**targeting**. So we built the triage brain first — an AI that reads the funder's actual
eligibility rules and economics and is willing to say *"skip this one"* — and put the
writing team behind it.

## What it does

Granted is a working product on **live Grants.gov data** (public API, no key needed):

1. **Profile** — paste anything about your org; Claude extracts a structured profile of
   your real programs and outcomes. Extraction only, never invention.
2. **Triage** — for any open federal grant, the **Analyst** agent produces a go/no-go
   brief: eligibility as a hard gate, mission alignment, capacity vs. award size, effort
   estimate, and the expected-value math shown (`award × win odds − cost to apply`).
   It honestly recommends **skipping** bad-fit grants — the demo includes a
   perfect-sounding reentry grant that Granted correctly rejects because its eligibility
   list excludes nonprofits.
3. **Draft** — a streaming multi-agent pipeline: the **Strategist** plans around the
   funder's priorities, the **Writer** drafts every section grounded in your real outcomes
   (leaving visible `[ADD: …]` placeholders instead of inventing data), the **Reviewer**
   scores the draft like the funder's panel, and the **Reviser** rewrites what got flagged
   — with a visible before/after score (74 → 88 in the bundled demo run) and per-section revision diffs.
4. **Track** — a deadline-sorted pipeline board with combined expected value.

## How we built it

Next.js 16 + TypeScript + Tailwind 4; Claude Opus 5 through the Anthropic SDK. Fit briefs,
plans, and reviews use structured outputs (`messages.parse` + Zod schemas) so the UI never
parses prose. The drafting pipeline is an async generator streamed over server-sent
events; the Writer streams all sections in one call through a chunk-boundary-safe marker
parser (unit-tested down to one-character chunks). Deterministic code owns the arithmetic
(expected value, capacity ratios, eligibility-code mapping); the model owns judgment.
Vitest covers the parsers and gating logic; a Playwright smoke test drives the entire user
journey and captured our README screenshots.

## Challenges we ran into

- **Streaming one draft into seven live sections** without a markdown parser dependency —
  solved with a marker protocol and an incremental parser that survives markers split
  across arbitrary chunk boundaries.
- **Keeping the AI honest — including about eligibility.** Our own adversarial review pass
  caught the fallback fit engine treating Grants.gov's "Others" applicant category as if it
  covered nonprofits. It doesn't — funders define "Others" themselves. The fix (read the
  funder's own eligibility text, and return "unclear" rather than false confidence when it's
  silent) is now pinned by unit tests against real snapshot data, and the same rule is written
  into the live Analyst's prompt. In drafting, a hard grounding contract plus the visible
  `[ADD: …]` convention keeps invented statistics out of proposals.
- **Making "no key" a real experience, not a wall:** a transparent heuristic fit engine
  (real scoring logic, honestly labeled) and a replayed pipeline demo mean judges can
  explore everything with zero setup.
- Our Playwright smoke test caught a genuine state-loss bug (debounced localStorage writes
  dropped on hard navigation) that manual testing missed.

## Accomplishments we're proud of

- A product where the AI's most valuable output is sometimes **"don't apply"** — with the
  reasoning and the math to back it up.
- The self-correcting draft loop: watch the panel score move (74 to 88 in the demo run) as the Reviser
  addresses specific critical notes, with before/after diffs.
- End-to-end robustness: every external dependency (Claude, Grants.gov, even the browser's
  storage) has a tested fallback.
- Real unit economics, measured not claimed: each live draft shows its own token-metered
  compute cost in the UI (~$0.40 at Opus 5 list prices) — against a $3,000–5,000 human alternative.

## What we learned

Multi-agent isn't about more agents — it's about **separating judgment from generation**.
The Reviewer only became useful when it got its own adversarial identity and a calibrated
scale, instead of being the Writer grading its own homework. And in a trust-critical
domain, the honest failure mode (*"[ADD: your placement rate]"*) is a feature users value
more than fluent confidence.

## What's next for Granted

Foundation and state funding sources (990-PF data), team accounts with Postgres + auth,
a win/loss feedback loop to calibrate per-category win rates in the EV model,
funder-specific Reviewer rubric packs (BJA/DOL/HHS), and JustGrants-format exports.
Grant consultants managing multiple orgs are the natural first paying segment.

## Built with

`next.js` · `typescript` · `react` · `tailwindcss` · `claude-opus-5` · `anthropic-sdk` ·
`zod` · `grants.gov-api` · `server-sent-events` · `vitest` · `playwright`

## Try it

- **Repo:** https://github.com/shi1720/ai-b-h (branch `claude/vibrant-bohr-r21wch`)
- 60-second tour: load the demo organization → analyze the featured Second Chance Act
  grant → draft → watch the review loop. Works with zero API keys.
