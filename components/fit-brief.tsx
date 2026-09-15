"use client";

import type { FitReport } from "@/lib/types";
import { formatMoneyFull } from "@/lib/format";
import { RecommendationPill, ScoreDial } from "./ui";

/** The Analyst's go/no-go brief, rendered in full. */
export function FitBrief({ report }: { report: FitReport }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-5">
        <ScoreDial score={report.fitScore} label="fit" size={84} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <RecommendationPill recommendation={report.recommendation} />
            <EligibilityPill verdict={report.eligibility.verdict} />
            <span
              className="pill border border-line bg-paper-deep text-ink-faint"
              title={
                report.engine !== "heuristic"
                  ? "Analyzed live by the AI Analyst"
                  : "Scored by the transparent heuristic engine (no API key configured)"
              }
            >
              {report.engine !== "heuristic" ? "AI Analyst" : "Heuristic engine"}
            </span>
          </div>
          <p className="mt-2.5 text-[15px] font-medium leading-relaxed text-pine-950">
            {report.verdict}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-paper p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-pine-700">
            Why it fits
          </h4>
          {report.alignment.strengths.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {report.alignment.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 text-pine-600">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-faint">Nothing substantial.</p>
          )}
        </div>
        <div className="rounded-xl border border-line bg-paper p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-strong">
            Risks & gaps
          </h4>
          {report.alignment.gaps.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {report.alignment.gaps.map((g, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 text-amber-strong">!</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-faint">No major flags.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Eligibility" value={report.eligibility.verdict} sub={report.eligibility.reasoning} />
        <Stat
          label="Effort to apply"
          value={`~${report.effort.hoursEstimate} hrs · ${report.effort.complexity}`}
          sub={report.effort.reasoning}
        />
        <Stat
          label="Planning estimate"
          value={
            report.economics.expectedValueUsd !== null
              ? `${report.economics.expectedValueUsd >= 0 ? "+" : "−"}${formatMoneyFull(Math.abs(report.economics.expectedValueUsd))}`
              : "unknown"
          }
          sub={report.economics.reasoning}
          tone={
            report.economics.expectedValueUsd === null
              ? undefined
              : report.economics.expectedValueUsd >= 0
                ? "good"
                : "bad"
          }
        />
      </div>

      <p className="text-xs text-ink-soft">Fit scores and assumed win odds are decision aids, not funding predictions. Eligibility still requires checking the full notice.</p>
      {report.winStrategy.length > 0 && (
        <div className="rounded-xl border border-pine-100 bg-pine-50/70 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-pine-700">
            If you apply: strengthen your case
          </h4>
          <ul className="mt-2 space-y-1.5 text-sm text-pine-950">
            {report.winStrategy.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-semibold text-pine-600">{i + 1}.</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EligibilityPill({ verdict }: { verdict: FitReport["eligibility"]["verdict"] }) {
  const map = {
    eligible: { cls: "bg-pine-50 text-pine-700 border border-pine-100", label: "Eligible" },
    ineligible: { cls: "bg-danger-soft text-danger", label: "Not eligible" },
    unclear: { cls: "bg-amber-soft text-amber-strong", label: "Eligibility unclear" },
  }[verdict];
  return <span className={`pill ${map.cls}`}>{map.label}</span>;
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{label}</h4>
      <div
        className={`mt-1 font-display text-lg font-semibold capitalize ${
          tone === "good" ? "text-pine-600" : tone === "bad" ? "text-danger" : "text-pine-950"
        }`}
      >
        {value}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{sub}</p>
    </div>
  );
}
