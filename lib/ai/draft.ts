import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type {
  DraftEvent,
  FitReport,
  GrantDetail,
  OrgProfile,
  Proposal,
  ProposalSection,
  ReviewNote,
} from "../types";
import { MODEL, anthropic } from "./client";
import {
  REVISER_SYSTEM,
  REVIEWER_SYSTEM,
  STRATEGIST_SYSTEM,
  WRITER_SYSTEM,
  grantContext,
  orgContext,
} from "./prompts";
import { PlanSchema, RescoreSchema, ReviewSchema, type Plan } from "./schemas";

/**
 * Incremental parser for the Writer/Reviser stream format:
 * a line containing only `@@section_id@@` opens a section; everything after
 * it belongs to that section until the next marker. Deltas may split markers
 * across chunk boundaries, so we hold back the trailing partial line whenever
 * it could still become a marker.
 */
export class SectionStreamParser {
  private buffer = "";
  private current: string | null = null;

  constructor(
    private onMarker: (sectionId: string) => void,
    private onText: (sectionId: string, text: string) => void,
  ) {}

  push(chunk: string): void {
    this.buffer += chunk;
    // Process every complete line.
    let nl: number;
    while ((nl = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, nl + 1);
      this.buffer = this.buffer.slice(nl + 1);
      this.handleLine(line);
    }
    // Flush the partial tail early for smooth streaming — unless it could
    // still turn into a marker line.
    if (this.buffer && !this.couldBeMarkerPrefix(this.buffer) && this.current) {
      this.onText(this.current, this.buffer);
      this.buffer = "";
    }
  }

  flush(): void {
    if (this.buffer) this.handleLine(this.buffer);
    this.buffer = "";
  }

  private handleLine(line: string): void {
    const marker = line.trim().match(/^@@([a-z0-9_]+)@@$/);
    if (marker) {
      this.current = marker[1];
      this.onMarker(marker[1]);
      return;
    }
    if (this.current) this.onText(this.current, line);
  }

  private couldBeMarkerPrefix(partial: string): boolean {
    const t = partial.trimStart();
    // Hold back anything that could still complete into `@@section_id@@\n`,
    // including a full marker whose newline hasn't arrived yet.
    return t === "" || "@@".startsWith(t) || /^@@[a-z0-9_]*@{0,2}$/.test(t);
  }
}

interface DraftInput {
  grant: GrantDetail;
  org: OrgProfile;
  fit?: FitReport | null;
}

/**
 * The full drafting pipeline as an async generator of UI events:
 *
 *   Strategist → plans the proposal around the funder's real priorities
 *   Writer     → streams every section, grounded in the org's facts
 *   Reviewer   → scores the draft as the funder's panel would
 *   Reviser    → rewrites the flagged sections, then the panel rescores
 *
 * Five Claude calls total (≈$0.25–0.40 at Opus 5 rates for a full proposal).
 */
export async function* draftProposal({ grant, org, fit }: DraftInput): AsyncGenerator<DraftEvent> {
  const client = anthropic();
  const shared = `${orgContext(org)}\n\n${grantContext(grant)}${
    fit
      ? `\n\n## Analyst's fit brief\nVerdict: ${fit.verdict}\nStrengths: ${fit.alignment.strengths.join("; ")}\nGaps to preempt: ${fit.alignment.gaps.join("; ")}\nWin strategy: ${fit.winStrategy.join("; ")}`
      : ""
  }`;

  // ── Stage 1: Strategist ────────────────────────────────────────────────
  yield {
    type: "agent_start",
    agent: "strategist",
    message: "Reading the funder's synopsis and planning the narrative…",
  };

  const planResp = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: STRATEGIST_SYSTEM,
    messages: [
      {
        role: "user",
        content: `${shared}\n\nDesign the proposal plan for this organization and opportunity.`,
      },
    ],
    output_config: { format: zodOutputFormat(PlanSchema) },
  });
  const plan = planResp.parsed_output;
  if (!plan) throw new Error("The Strategist couldn't produce a plan. Try again.");

  yield {
    type: "plan",
    title: plan.proposalTitle,
    sections: plan.sections.map((s) => ({ id: s.id, title: s.title })),
    strategy: plan.strategy,
  };
  yield {
    type: "agent_done",
    agent: "strategist",
    message: `Planned ${plan.sections.length} sections around the funder's priorities.`,
  };

  // ── Stage 2: Writer ────────────────────────────────────────────────────
  yield {
    type: "agent_start",
    agent: "writer",
    message: "Drafting every section, grounded in your organization's real outcomes…",
  };

  const sections = new Map<string, ProposalSection>(
    plan.sections.map((s) => [s.id, { id: s.id, title: s.title, content: "" }]),
  );

  yield* streamSections({
    system: WRITER_SYSTEM,
    prompt: `${shared}\n\n## Proposal plan\nTitle: ${plan.proposalTitle}\nStrategy: ${plan.strategy}\n\nSections to write, in order:\n${plan.sections
      .map((s) => `- @@${s.id}@@ "${s.title}" (~${s.wordTarget} words) — ${s.guidance}`)
      .join("\n")}\n\nWrite the full draft now, using the exact @@section_id@@ markers.`,
    maxTokens: 16000,
    sections,
    plan,
    eventNames: { start: "section_start", delta: "section_delta", done: "section_done" },
  });

  yield { type: "agent_done", agent: "writer", message: "First draft complete." };

  // ── Stage 3: Reviewer ──────────────────────────────────────────────────
  yield {
    type: "agent_start",
    agent: "reviewer",
    message: "Scoring the draft the way the funder's review panel would…",
  };

  const draftText = [...sections.values()]
    .map((s) => `@@${s.id}@@ ${s.title}\n${s.content.trim()}`)
    .join("\n\n");

  const reviewResp = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: REVIEWER_SYSTEM,
    messages: [
      {
        role: "user",
        content: `${grantContext(grant)}\n\n## Draft proposal (sections keyed by id)\n${draftText}\n\nScore this draft and list your notes.`,
      },
    ],
    output_config: { format: zodOutputFormat(ReviewSchema) },
  });
  const review = reviewResp.parsed_output;
  if (!review) throw new Error("The Reviewer couldn't score the draft. Try again.");

  // Keep only notes that reference real sections.
  const notes: ReviewNote[] = review.notes.filter((n) => sections.has(n.sectionId));
  yield { type: "review", notes, score: Math.round(review.score) };
  yield {
    type: "agent_done",
    agent: "reviewer",
    message: `Panel score: ${Math.round(review.score)}/100. ${review.summary}`,
  };

  // ── Stage 4: Reviser (only the sections the panel flagged) ─────────────
  const flagged = [
    ...new Set(
      notes
        .filter((n) => n.severity !== "polish")
        .sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1))
        .map((n) => n.sectionId),
    ),
  ].slice(0, 2);

  let scoreAfter = Math.round(review.score);

  if (flagged.length > 0) {
    yield {
      type: "agent_start",
      agent: "reviser",
      message: `Rewriting ${flagged.length} flagged section${flagged.length > 1 ? "s" : ""} to address the review…`,
    };

    yield* streamSections({
      system: REVISER_SYSTEM,
      prompt: `${shared}\n\n## Sections to revise\n${flagged
        .map((id) => {
          const s = sections.get(id)!;
          const sectionNotes = notes.filter((n) => n.sectionId === id);
          return `@@${id}@@ "${s.title}"\nCurrent draft:\n${s.content.trim()}\nPanel notes:\n${sectionNotes
            .map((n) => `- [${n.severity}] ${n.issue} → Fix: ${n.fix}`)
            .join("\n")}`;
        })
        .join("\n\n")}\n\nRewrite each listed section now, using the exact @@section_id@@ markers.`,
      maxTokens: 8000,
      sections,
      resetOnMarker: true,
      eventNames: { start: "revision_start", delta: "revision_delta", done: "revision_done" },
    });

    // Rescore just the revised sections against the original notes.
    const rescoreResp = await client.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      system: REVIEWER_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Your panel previously scored this draft ${Math.round(review.score)}/100 with these notes:\n${notes
            .map((n) => `- [${n.severity}] (${n.sectionId}) ${n.issue}`)
            .join("\n")}\n\nThe flagged sections have been revised:\n${flagged
            .map((id) => `@@${id}@@\n${sections.get(id)!.content.trim()}`)
            .join("\n\n")}\n\nGive the updated overall score.`,
        },
      ],
      output_config: { format: zodOutputFormat(RescoreSchema) },
    });
    const rescore = rescoreResp.parsed_output;
    if (rescore) scoreAfter = Math.round(rescore.score);

    yield {
      type: "agent_done",
      agent: "reviser",
      message: `Revision complete. Updated panel score: ${scoreAfter}/100.`,
    };
  }

  const proposal: Proposal = {
    grantId: grant.id,
    grantTitle: grant.title,
    orgName: org.name,
    title: plan.proposalTitle,
    sections: [...sections.values()].map((s) => ({ ...s, content: s.content.trim() })),
    reviewNotes: notes,
    scoreBefore: Math.round(review.score),
    scoreAfter,
    generatedAt: new Date().toISOString(),
    engine: "claude",
  };

  yield { type: "done", proposal };
}

interface StreamSectionsInput {
  system: string;
  prompt: string;
  maxTokens: number;
  sections: Map<string, ProposalSection>;
  plan?: Plan;
  /** Reviser mode: replace section content instead of appending. */
  resetOnMarker?: boolean;
  eventNames: {
    start: "section_start" | "revision_start";
    delta: "section_delta" | "revision_delta";
    done: "section_done" | "revision_done";
  };
}

/** Run one streaming call and translate the marker format into DraftEvents. */
async function* streamSections(input: StreamSectionsInput): AsyncGenerator<DraftEvent> {
  const { sections, plan, resetOnMarker, eventNames } = input;
  const pending: DraftEvent[] = [];
  let openSection: string | null = null;

  const closeOpen = () => {
    if (openSection) {
      pending.push({ type: eventNames.done, sectionId: openSection } as DraftEvent);
      openSection = null;
    }
  };

  const parser = new SectionStreamParser(
    (id) => {
      closeOpen();
      if (!sections.has(id)) {
        // The model opened a section outside the plan — tolerate it so the
        // content isn't lost, titled from the plan when possible.
        sections.set(id, {
          id,
          title: plan?.sections.find((s) => s.id === id)?.title ?? humanize(id),
          content: "",
        });
      } else if (resetOnMarker) {
        sections.get(id)!.content = "";
      }
      openSection = id;
      if (eventNames.start === "section_start") {
        pending.push({ type: "section_start", sectionId: id, title: sections.get(id)!.title });
      } else {
        pending.push({ type: "revision_start", sectionId: id });
      }
    },
    (id, text) => {
      sections.get(id)!.content += text;
      pending.push({ type: eventNames.delta, sectionId: id, text } as DraftEvent);
    },
  );

  const stream = anthropic().messages.stream({
    model: MODEL,
    max_tokens: input.maxTokens,
    system: input.system,
    messages: [{ role: "user", content: input.prompt }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      parser.push(event.delta.text);
    }
    while (pending.length) yield pending.shift()!;
  }
  parser.flush();
  closeOpen();
  while (pending.length) yield pending.shift()!;

  const final = await stream.finalMessage();
  if (final.stop_reason === "max_tokens") {
    throw new Error("The draft was cut off by the token limit. Try again.");
  }
  if (final.stop_reason === "refusal") {
    throw new Error("Claude declined to draft this content.");
  }
}

function humanize(slug: string): string {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
