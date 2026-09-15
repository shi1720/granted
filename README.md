# Granted

**The AI grants team for small nonprofits.**

[Try the app](https://grantedai.web.app) · [Watch the demo](https://youtu.be/vnCDy0VRRvM) · [Judge testing guide](docs/JUDGES.md) · [Project story](docs/devpost.md) · [Pitch deck](docs/pitch-deck.pdf)

Granted helps a small nonprofit decide which federal opportunities deserve its time, then turn its programs and outcomes into a reviewed, editable proposal.

![Granted workspace](docs/screenshots/01-landing.png)

## The workflow

1. Paste an organization summary, enter a profile by hand, or load the fictional Brightpath sample.
2. Search live Grants.gov opportunities and inspect source notices.
3. Get an eligibility and fit brief with risks, effort, and explicit planning assumptions.
4. Run the Strategist, Writer, Reviewer, and Reviser. Watch the proposal stream into sections.
5. Resolve missing evidence, edit the narrative, download Markdown, and track deadlines and next steps.

The public demo needs no login or API key. It has hourly request limits. Brightpath's statistics are fictional examples. Grant records come from Grants.gov; a bundled snapshot is explicitly labeled when the upstream service is unavailable.

## Run locally

```bash
npm ci
cp .env.example .env.local
# Add OPENAI_API_KEY to .env.local
npm run dev
```

Open http://localhost:3000. The default OpenAI model is `gpt-4.1-mini`. An optional Anthropic adapter is available when only `ANTHROPIC_API_KEY` is configured. Keys remain server-side.

Without a key, fit analysis uses a labeled deterministic heuristic. Proposal replay is limited to the featured example and the sample organization. Live profile extraction requires a configured provider.

## Architecture

- **Next.js 16, React, TypeScript, Tailwind CSS:** application and server routes.
- **Grants.gov public API:** opportunity search, synopsis, eligibility, dates, and awards.
- **OpenAI Responses API:** structured extraction, analysis, planning, review, and streamed text. Requests use `store: false`.
- **Zod:** validation for input, structured output, and saved browser state.
- **Firebase Hosting:** clean public URL.
- **Cloud Run:** server-side application, capped at one instance for the public demo.
- **Secret Manager:** runtime API key, accessible to a dedicated service account.
- **Browser localStorage:** organization, fit briefs, proposals, pipeline stages, and notes.

Long AI requests connect directly to Cloud Run with an explicit origin allowlist. This avoids Firebase Hosting's 60-second request timeout. Normal pages and grant data use the Firebase URL.

## Trust and limits

Applicant-type exclusions are hard code-level gates. Unknown eligibility remains uncertain. Expired opportunities cannot receive a positive heuristic recommendation. Unsupported numeric claims in completed drafts become evidence placeholders. The reviewer sees original organization facts.

These controls reduce mistakes but do not prove that a proposal is factually correct or compliant. Numeric checks cannot validate the meaning of a statistic, and model reviews are not official funder scores. Read the full notice, verify every claim, and resolve placeholders before submitting. Assumed win odds and planning values are illustrative decision aids, not calibrated predictions.

Profiles and drafts persist in the current browser only. AI requests transmit relevant profile and grant data to the server and provider. There is no cross-device sync or team authentication. Changing the organization starts a fresh workspace. Download important work.

Per-instance request limits and a backend instance cap reduce public demo spending. They are not a substitute for authentication, a distributed quota system, billing alerts, or a production abuse-management service. Configure provider spending limits for any longer-lived deployment.

## Tests

```bash
npm run lint
npm test
npm run build
# With a local or hosted server and a valid server-side key:
BASE_URL=https://grantedai.web.app node scripts/api-smoke.mjs
```

The unit tests cover eligibility gates, expected-value arithmetic, streamed section parsing, invalid payloads, request limits, persisted state, and numeric evidence checks. The API smoke test exercises real profile extraction, live grant search, a known eligibility exclusion, and the complete drafting workflow. It consumes model tokens.

Browser testing covers profile loading, discovery, analysis, drafting, section editing, reload persistence, export, pipeline controls, and mobile navigation. See [the testing report](docs/TESTING.md) for the completed checks and limits.

## Deploy

The checked-in `Dockerfile`, `firebase.json`, `.firebaserc`, and `scripts/deploy-firebase.sh` describe the deployment. Use an authenticated Google Cloud/Firebase account with billing and the required project permissions. Create `granted-openai` in Secret Manager and grant the runtime service account access to that secret. Then run:

```bash
./scripts/deploy-firebase.sh
```

The script never embeds the API key in source or build arguments. `.env` files are excluded from Docker and Cloud Build uploads. Firebase site names are globally unique; the deployed site is `grantedai`.

## Roadmap

Pilot with nonprofit staff, measure real triage and editing effort, ingest full funding notices with citations, add foundation/state sources, provide Word export and authenticated shared workspaces. No real-world funding outcomes or time-saving claims have been established yet.

Built by Shivam Gupta for the AI Builders Hackathon 2026.
