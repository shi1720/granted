"use client";

import Link from "next/link";
import { useState } from "react";
import type { FitReport, GrantSummary } from "@/lib/types";
import { useGranted } from "./store";
import { FitBrief } from "./fit-brief";
import { DeadlinePill, RecommendationPill, ScoreDial, Spinner } from "./ui";

export function GrantCard({ grant, featured }: { grant: GrantSummary; featured?: boolean }) {
  const { org, fitReports, saveFitReport, pipeline, addToPipeline } = useGranted();
  const [analyzing, setAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const report: FitReport | undefined = fitReports[grant.id];
  const saved = pipeline.some((p) => p.grant.id === grant.id);

  async function analyze() {
    if (!org) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId: grant.id, org }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed.");
      saveFitReport(json.report);
      if (json.warning) setError(json.warning);
      setExpanded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <article
      className={`card p-5 transition hover:shadow-pop ${featured ? "border-pine-600 ring-1 ring-pine-100" : ""}`}
    >
      {featured && (
        <span className="pill mb-2 bg-pine-700 text-paper">Featured demo opportunity</span>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/grants/${grant.id}`}
            className="font-display text-lg font-semibold leading-snug text-pine-950 hover:text-pine-700"
          >
            {grant.title}
          </Link>
          <p className="mt-1 text-sm text-ink-soft">
            {grant.agency} · <span className="text-ink-faint">{grant.number}</span>
          </p>
        </div>
        {report && <ScoreDial score={report.fitScore} size={56} />}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DeadlinePill closeDate={grant.closeDate} />
        {report && <RecommendationPill recommendation={report.recommendation} />}
        {grant.cfdaList.slice(0, 2).map((c) => (
          <span key={c} className="pill border border-line bg-paper-deep text-ink-faint">
            CFDA {c}
          </span>
        ))}
      </div>

      {report && expanded && (
        <div className="mt-4 border-t border-line pt-4 animate-fade-up">
          <FitBrief report={report} />
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!report ? (
          <button onClick={analyze} disabled={analyzing || !org} className="btn-primary text-xs px-4 py-2">
            {analyzing ? (
              <>
                <Spinner className="h-3.5 w-3.5" /> Analyst working…
              </>
            ) : (
              "Analyze fit"
            )}
          </button>
        ) : (
          <button onClick={() => setExpanded((e) => !e)} className="btn-secondary text-xs px-4 py-2">
            {expanded ? "Hide brief" : "Show go/no-go brief"}
          </button>
        )}
        <Link href={`/grants/${grant.id}`} className="btn-secondary text-xs px-4 py-2">
          Open workspace →
        </Link>
        <button
          onClick={() =>
            addToPipeline({
              grant,
              stage: "researching",
              fitScore: report?.fitScore,
              recommendation: report?.recommendation,
              savedAt: new Date().toISOString(),
            })
          }
          disabled={saved}
          className="btn-ghost text-xs"
        >
          {saved ? "✓ In pipeline" : "+ Save to pipeline"}
        </button>
      </div>
    </article>
  );
}
