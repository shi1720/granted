"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentName,
  DraftEvent,
  FitReport,
  GrantDetail,
  Proposal,
  ReviewNote,
} from "@/lib/types";
import { AGENT_META } from "@/lib/types";
import { useGranted } from "./store";
import { Prose } from "./prose";
import { ScoreDial, Spinner } from "./ui";

type AgentState = "idle" | "running" | "done";

interface SectionState {
  id: string;
  title: string;
  content: string;
  original?: string; // pre-revision content, kept for the before/after toggle
  streaming: boolean;
}

interface StudioState {
  phase: "idle" | "running" | "done" | "error";
  agents: Record<AgentName, { state: AgentState; message: string }>;
  planTitle: string | null;
  strategy: string | null;
  order: string[];
  sections: Record<string, SectionState>;
  notes: ReviewNote[];
  scoreBefore: number | null;
  scoreAfter: number | null;
  error: string | null;
  needKey: boolean;
}

const AGENT_ORDER: AgentName[] = ["strategist", "writer", "reviewer", "reviser"];

const initialState = (): StudioState => ({
  phase: "idle",
  agents: {
    strategist: { state: "idle", message: "" },
    writer: { state: "idle", message: "" },
    reviewer: { state: "idle", message: "" },
    reviser: { state: "idle", message: "" },
  },
  planTitle: null,
  strategy: null,
  order: [],
  sections: {},
  notes: [],
  scoreBefore: null,
  scoreAfter: null,
  error: null,
  needKey: false,
});

export function DraftStudio({ grant, fit }: { grant: GrantDetail; fit: FitReport | null }) {
  const { org, proposals, saveProposal, aiStatus } = useGranted();
  const [s, setS] = useState<StudioState>(initialState);
  const abortRef = useRef<AbortController | null>(null);
  const existing: Proposal | undefined = proposals[grant.id];

  // Load a previously drafted proposal into the studio view.
  useEffect(() => {
    if (existing && s.phase === "idle") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- proposals hydrate from localStorage after mount.
      setS((prev) => ({
        ...prev,
        phase: "done",
        planTitle: existing.title,
        order: existing.sections.map((x) => x.id),
        sections: Object.fromEntries(
          existing.sections.map((x) => [
            x.id,
            { id: x.id, title: x.title, content: x.content, streaming: false },
          ]),
        ),
        notes: existing.reviewNotes,
        scoreBefore: existing.scoreBefore,
        scoreAfter: existing.scoreAfter,
        agents: Object.fromEntries(
          AGENT_ORDER.map((a) => [a, { state: "done" as const, message: "" }]),
        ) as StudioState["agents"],
      }));
    }
  }, [existing, s.phase]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const apply = useCallback((e: DraftEvent) => {
    setS((prev) => {
      const next = { ...prev, sections: { ...prev.sections }, agents: { ...prev.agents } };
      switch (e.type) {
        case "agent_start":
          next.agents[e.agent] = { state: "running", message: e.message };
          break;
        case "agent_done":
          next.agents[e.agent] = { state: "done", message: e.message };
          break;
        case "plan":
          next.planTitle = e.title;
          next.strategy = e.strategy;
          next.order = e.sections.map((x) => x.id);
          for (const sec of e.sections) {
            next.sections[sec.id] = { id: sec.id, title: sec.title, content: "", streaming: false };
          }
          break;
        case "section_start":
          next.sections[e.sectionId] = {
            id: e.sectionId,
            title: e.title,
            content: "",
            streaming: true,
          };
          if (!next.order.includes(e.sectionId)) next.order = [...next.order, e.sectionId];
          break;
        case "section_delta": {
          const sec = next.sections[e.sectionId];
          if (sec) next.sections[e.sectionId] = { ...sec, content: sec.content + e.text };
          break;
        }
        case "section_done": {
          const sec = next.sections[e.sectionId];
          if (sec) next.sections[e.sectionId] = { ...sec, streaming: false };
          break;
        }
        case "review":
          next.notes = e.notes;
          next.scoreBefore = e.score;
          break;
        case "revision_start": {
          const sec = next.sections[e.sectionId];
          if (sec) {
            next.sections[e.sectionId] = {
              ...sec,
              original: sec.content,
              content: "",
              streaming: true,
            };
          }
          break;
        }
        case "revision_delta": {
          const sec = next.sections[e.sectionId];
          if (sec) next.sections[e.sectionId] = { ...sec, content: sec.content + e.text };
          break;
        }
        case "revision_done": {
          const sec = next.sections[e.sectionId];
          if (sec) next.sections[e.sectionId] = { ...sec, streaming: false };
          break;
        }
        case "done":
          next.phase = "done";
          next.scoreAfter = e.proposal.scoreAfter;
          break;
        case "error":
          next.phase = "error";
          next.error = e.message;
          break;
      }
      return next;
    });
  }, []);

  async function start() {
    if (!org) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setS({ ...initialState(), phase: "running" });

    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId: grant.id, org, fit }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setS((prev) => ({
          ...prev,
          phase: "error",
          error: json.error ?? "Drafting failed to start.",
          needKey: json.code === "need_key",
        }));
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalProposal: Proposal | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const data = frame
            .split("\n")
            .filter((l) => l.startsWith("data: "))
            .map((l) => l.slice(6))
            .join("");
          if (!data) continue;
          try {
            const event = JSON.parse(data) as DraftEvent;
            if (event.type === "done") finalProposal = event.proposal;
            apply(event);
          } catch {
            // Skip malformed frames rather than killing the stream.
          }
        }
      }

      if (finalProposal) saveProposal(finalProposal);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setS((prev) => ({ ...prev, phase: "error", error: "Connection lost while drafting." }));
      }
    }
  }

  function exportMarkdown() {
    const md = assembleMarkdown(s, grant);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${grant.number}-proposal.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const noteCountFor = (id: string) => s.notes.filter((n) => n.sectionId === id).length;

  // ——— idle: the launch card ———
  if (s.phase === "idle") {
    return (
      <div className="card p-6">
        <h2 className="font-display text-xl font-semibold text-pine-950">Draft the proposal</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Four agents run in sequence: the <strong>Strategist</strong> plans around this funder&apos;s
          priorities, the <strong>Writer</strong> drafts every section from your organization&apos;s real
          outcomes, the <strong>Reviewer</strong> scores it like the funder&apos;s panel would, and the{" "}
          <strong>Reviser</strong> rewrites whatever got flagged. You&apos;ll watch it happen live —
          typically 2–4 minutes.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={start} disabled={!org} className="btn-primary px-6 py-3">
            {aiStatus.aiEnabled ? "Start drafting with Claude" : "Watch the pipeline (demo replay)"}
          </button>
          {!aiStatus.aiEnabled && aiStatus.loaded && (
            <span className="max-w-md text-xs text-ink-faint">
              Demo mode replays a real pipeline run for the featured opportunity. Add an{" "}
              <code className="rounded bg-paper-deep px-1">ANTHROPIC_API_KEY</code> to draft live for any grant.
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* agent timeline */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-pine-950">
            {s.phase === "done" ? "Drafting complete" : s.phase === "error" ? "Drafting stopped" : "Agents at work"}
          </h2>
          <div className="flex items-center gap-2">
            {s.phase !== "running" && (
              <button onClick={start} className="btn-secondary text-xs px-4 py-2">
                {s.phase === "done" ? "Redraft from scratch" : "Retry"}
              </button>
            )}
            {s.phase === "done" && (
              <>
                <button onClick={exportMarkdown} className="btn-primary text-xs px-4 py-2">
                  Download .md
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(assembleMarkdown(s, grant))}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Copy
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {AGENT_ORDER.map((name) => {
            const a = s.agents[name];
            return (
              <div
                key={name}
                className={`rounded-xl border p-3.5 transition ${
                  a.state === "running"
                    ? "border-pine-600 bg-pine-50"
                    : a.state === "done"
                      ? "border-line bg-card"
                      : "border-line bg-paper-deep opacity-60"
                }`}
              >
                <div className="flex items-center gap-2">
                  {a.state === "running" ? (
                    <Spinner className="h-3.5 w-3.5 text-pine-600" />
                  ) : a.state === "done" ? (
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-pine-700 text-[9px] text-paper">✓</span>
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-line-strong" />
                  )}
                  <span className="text-sm font-semibold text-pine-950">{AGENT_META[name].label}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                  {a.message || AGENT_META[name].role}
                </p>
              </div>
            );
          })}
        </div>

        {s.strategy && (
          <div className="mt-4 rounded-xl border border-pine-100 bg-pine-50/60 p-4 animate-fade-up">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-pine-700">
              Strategist&apos;s read on this funder
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-pine-950">{s.strategy}</p>
          </div>
        )}

        {s.error && (
          <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {s.error}
            {s.needKey && (
              <span className="mt-1 block text-xs">
                Get a key at console.anthropic.com → add <code>ANTHROPIC_API_KEY</code> to{" "}
                <code>.env.local</code> → restart the dev server.
              </span>
            )}
          </p>
        )}
      </div>

      {/* review panel */}
      {s.scoreBefore !== null && (
        <div className="card p-5 animate-fade-up">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-4">
              <ScoreDial score={s.scoreBefore} size={64} label="draft" />
              {s.scoreAfter !== null && s.scoreAfter !== s.scoreBefore && (
                <>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <ScoreDial score={s.scoreAfter} size={64} label="revised" />
                </>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-semibold text-pine-950">
                Review panel verdict
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                The Reviewer scores drafts against this funder&apos;s stated priorities — the same
                lens a real panel uses. {s.notes.length > 0 && `${s.notes.length} note${s.notes.length > 1 ? "s" : ""} below.`}
              </p>
            </div>
          </div>
          {s.notes.length > 0 && (
            <ul className="mt-4 space-y-2">
              {s.notes.map((n, i) => (
                <li key={i} className="flex gap-3 rounded-xl border border-line bg-paper p-3.5 text-sm">
                  <SeverityBadge severity={n.severity} />
                  <div>
                    <p className="text-ink">
                      <span className="font-semibold text-pine-950">
                        {s.sections[n.sectionId]?.title ?? n.sectionId}:
                      </span>{" "}
                      {n.issue}
                    </p>
                    <p className="mt-1 text-xs text-pine-700">Fix: {n.fix}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* the proposal */}
      {s.planTitle && (
        <div className="card overflow-hidden animate-fade-up">
          <div className="border-b border-line bg-paper-deep px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Draft proposal · {grant.number}
            </p>
            <h2 className="font-display mt-1 text-2xl font-semibold leading-tight text-pine-950">
              {s.planTitle}
            </h2>
          </div>
          <div className="divide-y divide-line">
            {s.order.map((id) => {
              const sec = s.sections[id];
              if (!sec || (!sec.content && !sec.streaming)) return null;
              return (
                <SectionView key={id} section={sec} noteCount={noteCountFor(id)} />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionView({ section, noteCount }: { section: SectionState; noteCount: number }) {
  const [showOriginal, setShowOriginal] = useState(false);
  return (
    <section className="px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-pine-950">{section.title}</h3>
        <div className="flex items-center gap-2">
          {noteCount > 0 && (
            <span className="pill bg-amber-soft text-amber-strong">{noteCount} review note{noteCount > 1 ? "s" : ""}</span>
          )}
          {section.original && !section.streaming && (
            <button
              onClick={() => setShowOriginal((v) => !v)}
              className="pill cursor-pointer border border-pine-100 bg-pine-50 text-pine-700 hover:bg-pine-100"
            >
              {showOriginal ? "Show revision" : "Revised ✦ view original"}
            </button>
          )}
        </div>
      </div>
      <div className="mt-3">
        <Prose
          text={showOriginal && section.original ? section.original : section.content}
          streaming={section.streaming}
        />
      </div>
    </section>
  );
}

function SeverityBadge({ severity }: { severity: ReviewNote["severity"] }) {
  const map = {
    critical: "bg-danger-soft text-danger",
    important: "bg-amber-soft text-amber-strong",
    polish: "bg-paper-deep text-ink-faint",
  }[severity];
  return <span className={`pill h-fit shrink-0 ${map}`}>{severity}</span>;
}

function assembleMarkdown(s: StudioState, grant: GrantDetail): string {
  const lines = [
    `# ${s.planTitle ?? "Draft Proposal"}`,
    ``,
    `*Prepared with Granted for ${grant.title} (${grant.number}), ${grant.agency}.*`,
    s.scoreAfter !== null ? `*Internal review score: ${s.scoreBefore} → ${s.scoreAfter} / 100.*` : ``,
    ``,
  ];
  for (const id of s.order) {
    const sec = s.sections[id];
    if (!sec?.content) continue;
    lines.push(`## ${sec.title}`, ``, sec.content.trim(), ``);
  }
  lines.push(
    `---`,
    `*Drafted by Granted's agent pipeline. Review every [ADD: …] placeholder and verify all facts before submission.*`,
  );
  return lines.join("\n");
}
