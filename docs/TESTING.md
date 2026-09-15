# Granted validation report

Tested on 15 September 2026. Public deployment: https://grantedai.web.app. Cloud Run revision: `granted-00006-pp6`.

## Automated checks

- ESLint: passed.
- TypeScript and production Next.js build: passed.
- Vitest: 41 tests passed across 4 files.
- Live hosted API checks: all 8 passed.

- Server reports a configured AI model: passed (0.6s).
- Reject invalid grant IDs: passed (0.4s).
- Reject malformed AI requests: passed (0.4s).
- Reject foreign origin: passed (0.3s).
- Extract a live, grounded organization profile: passed (2.9s).
- Search live Grants.gov data: passed (0.5s).
- Enforce the government-only eligibility gate: passed (0.4s).
- Complete live strategy, writing, review and revision: passed (46.9s).

## Browser checks

- Loaded the fictional sample, saved the organization, and navigated to discovery.
- Loaded live grant search results and opened the featured opportunity.
- Generated a live fit brief and confirmed the government-only example blocks drafting.
- Completed the four drafting stages against the hosted OpenAI integration.
- Opened the evidence checklist, edited a section, and verified the edit after reload.
- Copied and downloaded the Markdown proposal.
- Changed pipeline stage, saved a note, and verified persistence after reload.
- Inspected landing, onboarding, discovery, and pipeline at phone widths. Fixed horizontal overflow in the pipeline summary and controls.
- Reviewed desktop typography, navigation, source labels, loading and completion states.

## Media

- Narrated 1080p product demo: 2 minutes 47 seconds, with burned-in English captions and an SRT file.
- FFmpeg decoded the complete final video without errors. Caption frames were visually inspected.
- Nine-slide editable pitch deck rendered, visually reviewed, exported to PDF, and structurally validated.

## Limits

This is a functional hackathon prototype, not evidence of real-world funding success. Testing does not establish universal browser compatibility, load capacity, calibrated fit scores, or factual perfection. The data source and model can change. Numeric grounding is conservative and cannot verify every claim. A person must check the full notice and final proposal. No external nonprofit pilot has been completed.
