# Granted — Architecture

This document explains the technical decisions behind Granted: how the agent pipeline is
designed, why it's shaped this way, and what makes it robust and cheap enough to run as a
real product.

## System overview

Granted is a single Next.js 16 app (App Router, TypeScript, Tailwind 4) with stateless API
routes. There are three external surfaces:

1. **Grants.gov public API** (`api.grants.gov/v1/api/search2`, `fetchOpportunity`) — live
   US federal grant data, no key required. Responses are lightly cached (5 min search /
   1 h detail) via Next's fetch cache.
2. **Claude API** (`claude-opus-5` by default, overridable via `ANTHROPIC_MODEL`) — all
   intelligence in the product.
3. **The browser** — profile, fit briefs, pipeline, and proposals persist in
   `localStorage`. The server holds zero user state, which makes the MVP trivially
   deployable (Vercel/any Node host) and private by default.

## The agent pipeline

The core design principle: **separate judgment from generation, and make the pipeline
critique itself before the user sees anything.**

### Analyst (`lib/ai/match.ts`)

One `messages.parse` call with a Zod schema (`FitAnalysisSchema`). The Analyst receives the
org profile and the full opportunity context (synopsis, structured eligibility codes, award
floor/ceiling, cost-sharing flags, deadline) and returns a typed go/no-go brief:

- **Eligibility is prompted as a hard gate** — mission fit cannot rescue an ineligible org.
- The model estimates a conservative **win probability**, and the app computes expected
  value deterministically: `realistic award × win rate − application cost`. The model
  reasons; the arithmetic is code. (`lib/fit.ts`)
- Score calibration is prompted explicitly ("scores above 75 should be rare").

### Drafting pipeline (`lib/ai/draft.ts`)

An async generator that yields typed `DraftEvent`s, streamed to the browser as
server-sent events. Five model calls, one warm prompt-cache lane (same model, shared
context blocks):

| Stage | Call | Output |
|---|---|---|
| Strategist | `messages.parse` (PlanSchema) | Proposal title, funder-priority read, 5–7 sections with per-section guidance and word targets |
| Writer | `messages.stream` | All sections in one stream, delimited by `@@section_id@@` marker lines |
| Reviewer | `messages.parse` (ReviewSchema) | Panel-style 0–100 score + typed notes (section, severity, issue, concrete fix) |
| Reviser | `messages.stream` | Rewrites of only the flagged sections (≤2), same marker format |
| Rescore | `messages.parse` (RescoreSchema) | Updated panel score after revision |

**Why markers instead of one-call-per-section?** One streaming call for the whole draft is
~7× fewer round-trips, keeps cross-section coherence (the Writer sees what it already
wrote), and costs less. The cost is parsing risk — handled by `SectionStreamParser`, which
holds back any trailing partial line that could still become a marker. It's unit-tested
against the harshest case: the entire stream delivered one character at a time, plus
`@@`-prefixed prose that must *not* be treated as a marker.

**Why revise only flagged sections?** A full second draft doubles cost and latency for
marginal gain. The Reviewer's notes carry `severity`; the Reviser targets `critical` and
`important` notes on at most two sections, then a cheap rescore call closes the loop. The
user sees the score move (e.g. 74 → 88) and can toggle each revised section's before/after.

### Grounding and honesty

Every agent receives the same `orgContext` / `grantContext` blocks (`lib/ai/prompts.ts`).
The Writer's system prompt forbids inventing statistics, partners, staff, or outcomes;
where a reviewer will expect a number the profile lacks, it must emit `[ADD: description]`.
The UI renders these as highlighted placeholders — a deliberate feature: an honest draft
with visible gaps beats a confident draft with invented facts, because a fabricated
statistic in a federal application is disqualifying (or worse).

## Robustness model

The demo brief said pipelines are judged on efficiency and robustness end to end. The
failure matrix:

| Failure | Behavior |
|---|---|
| No `ANTHROPIC_API_KEY` | Fit analysis falls back to a **transparent heuristic engine** (`lib/fit.ts`) — real eligibility-code mapping, keyword alignment, capacity ratios, EV math — labeled "Heuristic engine" in the UI. Drafting replays a pre-generated pipeline run for the featured grant so the full UX is explorable. |
| Grants.gov unreachable | Search/detail fall back to a bundled snapshot of real opportunities (labeled "Offline snapshot"). |
| Claude API error (auth/rate-limit/network) | Typed SDK errors (`AuthenticationError`, `RateLimitError`, …) map to friendly messages; match falls back to the heuristic engine with a warning; the SSE stream emits a terminal `error` event the UI renders in place. |
| Model emits an unplanned section id | The parser tolerates it (content is kept, titled from the slug) rather than dropping text. |
| `max_tokens`/refusal stop reasons | Detected on the final message; surfaced as a retryable error instead of a silently truncated draft. |
| Client disconnects mid-draft | The route's stream controller closes; an `AbortController` on the client cancels cleanly on re-run/unmount. |
| Hard navigation mid-flow | State writes to `localStorage` synchronously (a debounce here was a real bug our Playwright smoke test caught — see `scripts/smoke.mjs`). |

Input validation: every API route validates its payload (Zod `OrgProfileZ` for profiles,
regex for opportunity ids) and returns typed JSON errors. The SSE consumer skips malformed
frames rather than aborting the stream.

## Cost & latency (why this works as a product)

At Claude Opus 5 list prices ($5/M input, $25/M output):

- **Fit brief:** ~4K in / ~1K out ≈ **$0.05–0.08**, ~15–25 s.
- **Full proposal (5 calls):** ~25K in / ~8K out ≈ **$0.30–0.45**, ~2–4 min end to end
  (dominated by the Writer stream, which the user watches live — perceived latency ≈ 0).
- `ANTHROPIC_MODEL=claude-sonnet-5` cuts costs ~2.5× where volume demands it.

Against the alternative — $3,000–5,000 per professionally written federal proposal, or
40+ hours of an ED's time — the unit economics support a $49/mo price with >90% gross
margin at realistic usage (a heavy user drafting 10 proposals/month costs ≈ $4.50).

## Testing

- **Unit (vitest, 26 tests):** Grants.gov parsers (money strings, entity-laden titles,
  timezone-suffixed dates), eligibility gating per org type, EV/capacity math, deadline
  penalties, and the stream parser's chunk-boundary behavior.
- **End-to-end (Playwright, `scripts/smoke.mjs`):** onboarding → live discover → fit
  analysis → workspace → full draft pipeline → export affordances → pipeline board,
  asserting on live-data badges, the revision toggle, and captured screenshots.

## What's deliberately out of scope for the MVP

- Auth/multi-user (localStorage keeps the MVP private and serverless; Postgres + auth is
  the first post-hackathon milestone).
- Non-federal sources (foundation/state data is the roadmap's biggest lever).
- Auto-submission — intentionally never: Granted drafts, humans decide.
