## Inspiration

A small nonprofit can know its community deeply and still struggle to fund its work. The person running a program may also be the person searching funding notices, checking eligibility, and writing the application after everyone else has gone home.

Granted started with a question: **what if a small team could get a clear answer about where to spend its limited time before writing a proposal?**

That question shaped the product. A useful grants assistant should help an organization walk away from the wrong opportunity as confidently as it helps it pursue the right one.

## What it does

Granted is an AI grants workspace for small nonprofits.

1. **Build your organization profile.** Paste a mission statement or program summary. AI extracts an editable profile of your programs, outcomes, budget, and organization type. You can also enter everything by hand.
2. **Find federal opportunities.** Search live Grants.gov data and filter by funding category. Each opportunity links back to its source.
3. **Decide whether to apply.** The Analyst produces a go/no-go brief covering eligibility, mission fit, capacity, risks, and estimated effort. Deterministic checks prevent obvious applicant-type exclusions from becoming an enthusiastic recommendation.
4. **Create a reviewed draft.** A Strategist plans the narrative, a Writer drafts the sections, a Reviewer critiques them, and a Reviser addresses selected issues. Progress streams into the workspace.
5. **Finish the work.** Review evidence placeholders, edit individual sections, download Markdown, and track the opportunity in a deadline-aware pipeline.

The demo includes Brightpath, a fictional nonprofit with clearly labeled sample outcomes. It pairs that profile with real federal opportunities. One is relevant to its reentry work. Another sounds relevant but excludes its organization type. Granted says to skip it.

## How we built it

The application uses **Next.js, React, TypeScript, and Tailwind CSS**. Server routes retrieve public Grants.gov data. The AI layer uses the **OpenAI Responses API with GPT-4.1 mini**, with an optional Anthropic adapter for deployments configured with that provider.

Zod validates structured AI results and incoming profiles. Proposal text streams as server-sent events. A section parser handles markers split across network chunks, so sections appear progressively without losing text.

We keep organization profiles, fit briefs, proposals, and the pipeline in the user's browser. AI requests send the relevant profile and opportunity to the server and model provider. The deployed OpenAI integration requests `store: false`. API keys remain in Google Secret Manager and never enter the browser bundle.

**Firebase Hosting serves the public address, and Cloud Run runs the application.** Long drafting requests connect directly to the backend so Firebase's proxy timeout cannot cut off the workflow. The public demo has request limits and a capped backend instance count.

## Challenges we ran into

**Eligibility cannot be left to a persuasive answer.** We made applicant-type exclusions a code-level gate and distinguish uncertain eligibility from a confirmed match.

**A review loop can introduce new mistakes.** During a live test, a revision invented a cumulative participant count. We changed the reviewer context to include the original organization facts, strengthened revision instructions, and added a conservative numeric check that flags figures absent from the supplied evidence. This is a review aid, not a complete fact checker.

**A good generation is only part of a usable product.** We fixed mobile navigation, multiline profile editing, stale search responses, incomplete streams, and recommendations that could survive a change of organization. We added section editing and a checklist that makes missing evidence actionable.

**Deployment changes the behavior of streaming apps.** We designed around Firebase's request timeout and tested the hosted workflow, not just local development.

## Accomplishments that we're proud of

- A complete path from organization profile to a reviewed, editable proposal and tracked opportunity.
- A reproducible eligibility example where the product gives an honest reason to skip a grant.
- Live grant data, visible source links, and clearly labeled fallback behavior.
- Server-side secrets, validated inputs, request limits, and cancellation of generation.
- Automated coverage for eligibility boundaries, stream parsing, request validation, and unsupported numeric claims, alongside live API and browser testing.
- A responsive public application that judges can try without creating an account or supplying an API key.

## What we learned

The most useful part of AI assistance is often the decision it helps someone make before generating text. For this product, helping a small team avoid an unsuitable application is a meaningful outcome.

We also learned that instructions alone are insufficient for trust. Reliable software needs explicit rules, clear uncertainty, visible evidence gaps, and an easy way for a person to correct the result.

Finally, usability lives in the details: a working mobile menu, a saved edit after a refresh, an honest error message, and an export that someone can use outside the app.

## What's next for Granted

The next step is a pilot with nonprofit staff and grant consultants to measure time spent on triage, the usefulness of the briefs, and the amount of editing proposals need. We have not yet established real-world time savings or funding outcomes.

We plan to add foundation and state sources, full-notice document ingestion with citations, application checklists tailored to each funder, Word export, and authenticated team workspaces. Longer term, consented application outcomes could help us evaluate and calibrate our planning assumptions.

**Granted's promise is simple: help small teams spend more of their time on the opportunities that deserve it.**

## Try it

[Open Granted](https://grantedai.web.app). No login is required. Open the workspace, load the sample organization, and save it to start exploring. Use the guided links in Discover to compare a relevant opportunity with an ineligible one. Then draft, review the missing evidence, edit a section, and download the result.

Fit scores, review scores, and assumed win odds are planning aids. They are not official funder evaluations or guarantees. Always check the full notice and review generated claims before submitting an application.
