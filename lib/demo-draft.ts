/**
 * Replays the pre-generated demo drafting run as the same DraftEvent stream
 * the live pipeline emits, with realistic pacing. The UI cannot tell the
 * difference — by design, so the demo exercises the real rendering path.
 */

import {
  DEMO_PLAN,
  DEMO_REVIEW_NOTES,
  DEMO_REVISED_SECTIONS,
  DEMO_SCORE_AFTER,
  DEMO_SCORE_BEFORE,
  DEMO_SECTIONS_V1,
  buildDemoProposal,
} from "./demo";
import type { DraftEvent } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Split text into small chunks so the demo streams like a live model. */
function* chunks(text: string, size = 36): Generator<string> {
  for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
}

export async function* demoDraftEvents(): AsyncGenerator<DraftEvent> {
  yield {
    type: "agent_start",
    agent: "strategist",
    message: "Reading the funder's synopsis and planning the narrative…",
  };
  await sleep(1600);
  yield {
    type: "plan",
    title: DEMO_PLAN.proposalTitle,
    sections: DEMO_PLAN.sections.map((s) => ({ id: s.id, title: s.title })),
    strategy: DEMO_PLAN.strategy,
  };
  yield {
    type: "agent_done",
    agent: "strategist",
    message: `Planned ${DEMO_PLAN.sections.length} sections around the funder's priorities.`,
  };
  await sleep(500);

  yield {
    type: "agent_start",
    agent: "writer",
    message: "Drafting every section, grounded in your organization's real outcomes…",
  };
  for (const s of DEMO_PLAN.sections) {
    yield { type: "section_start", sectionId: s.id, title: s.title };
    for (const c of chunks(DEMO_SECTIONS_V1[s.id] ?? "")) {
      yield { type: "section_delta", sectionId: s.id, text: c };
      await sleep(14);
    }
    yield { type: "section_done", sectionId: s.id };
    await sleep(120);
  }
  yield { type: "agent_done", agent: "writer", message: "First draft complete." };
  await sleep(400);

  yield {
    type: "agent_start",
    agent: "reviewer",
    message: "Scoring the draft the way the funder's review panel would…",
  };
  await sleep(2400);
  yield { type: "review", notes: DEMO_REVIEW_NOTES, score: DEMO_SCORE_BEFORE };
  yield {
    type: "agent_done",
    agent: "reviewer",
    message: `Panel score: ${DEMO_SCORE_BEFORE}/100. Strong model and evidence, but the need statement won't survive a BJA panel as written.`,
  };
  await sleep(600);

  yield {
    type: "agent_start",
    agent: "reviser",
    message: "Rewriting 1 flagged section to address the review…",
  };
  for (const [sectionId, content] of Object.entries(DEMO_REVISED_SECTIONS)) {
    yield { type: "revision_start", sectionId };
    for (const c of chunks(content)) {
      yield { type: "revision_delta", sectionId, text: c };
      await sleep(14);
    }
    yield { type: "revision_done", sectionId };
  }
  await sleep(900);
  yield {
    type: "agent_done",
    agent: "reviser",
    message: `Revision complete. Updated panel score: ${DEMO_SCORE_AFTER}/100.`,
  };

  yield { type: "done", proposal: buildDemoProposal() };
}
