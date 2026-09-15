"use client";

import Link from "next/link";
import { Nav } from "@/components/nav";
import { useGranted } from "@/components/store";
import { DeadlinePill, EmptyState, RecommendationPill, ScoreDial } from "@/components/ui";
import { daysLeft, formatDate, formatMoneyFull } from "@/lib/format";
import type { PipelineEntry } from "@/lib/types";

const STAGES: { value: PipelineEntry["stage"]; label: string }[] = [
  { value: "researching", label: "Researching" },
  { value: "drafting", label: "Drafting" },
  { value: "ready", label: "Ready to submit" },
  { value: "submitted", label: "Submitted" },
];

export default function PipelinePage() {
  const { pipeline, fitReports, proposals, updatePipeline, removeFromPipeline, hydrated } =
    useGranted();

  const sorted = [...pipeline].sort((a, b) => {
    const da = daysLeft(a.grant.closeDate) ?? 9999;
    const db = daysLeft(b.grant.closeDate) ?? 9999;
    return da - db;
  });

  const totalEv = pipeline.reduce((sum, p) => {
    const ev = fitReports[p.grant.id]?.economics.expectedValueUsd;
    return ev && ev > 0 ? sum + ev : sum;
  }, 0);
  const nearest = sorted.find((p) => (daysLeft(p.grant.closeDate) ?? -1) >= 0);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-pine-950 sm:text-4xl">
          Your pipeline
        </h1>
        <p className="mt-2 text-ink-soft">
          Every saved opportunity, sorted by what&apos;s due first.
        </p>

        {hydrated && pipeline.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="Nothing saved yet"
              body="Save opportunities from Discover and track them from research to submission here."
              action={
                <Link href="/discover" className="btn-primary">
                  Find grants
                </Link>
              }
            />
          </div>
        ) : (
          <>
            {/* summary strip */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="card min-w-0 p-5">
                <div className="font-display text-3xl font-semibold text-pine-950">
                  {pipeline.length}
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  opportunit{pipeline.length === 1 ? "y" : "ies"} in play
                </p>
              </div>
              <div className="card min-w-0 p-5">
                <div className="font-display text-3xl font-semibold text-pine-950">
                  {nearest ? formatDate(nearest.grant.closeDate) : "Not available"}
                </div>
                <p className="mt-1 truncate text-sm text-ink-soft">
                  {nearest ? `next deadline · ${nearest.grant.title}` : "no upcoming deadlines"}
                </p>
              </div>
              <div className="card min-w-0 p-5">
                <div className="font-display text-3xl font-semibold text-pine-600">
                  {totalEv > 0 ? `+${formatMoneyFull(totalEv)}` : "Not available"}
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  sum of positive planning estimates, not secured funding
                </p>
              </div>
            </div>

            {/* entries */}
            <div className="mt-6 space-y-3">
              {sorted.map((p) => {
                const report = fitReports[p.grant.id];
                const hasDraft = Boolean(proposals[p.grant.id]);
                return (
                  <div key={p.grant.id} className="card flex flex-wrap items-center gap-4 p-4">
                    {report ? (
                      <ScoreDial score={report.fitScore} size={52} />
                    ) : (
                      <div className="grid h-13 w-13 shrink-0 place-items-center rounded-full border border-dashed border-line-strong text-[10px] text-ink-faint" style={{ width: 52, height: 52 }}>
                        no fit
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/grants/${p.grant.id}`}
                        className="font-display font-semibold leading-snug text-pine-950 hover:text-pine-700"
                      >
                        {p.grant.title}
                      </Link>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <DeadlinePill closeDate={p.grant.closeDate} />
                        {p.recommendation && <RecommendationPill recommendation={p.recommendation} />}
                        {hasDraft && (
                          <span className="pill bg-pine-50 text-pine-700 border border-pine-100">
                            Draft ready
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                      <select
                        aria-label={`Stage for ${p.grant.title}`}
                        className="input w-auto py-1.5 text-xs"
                        value={p.stage}
                        onChange={(e) =>
                          updatePipeline(p.grant.id, { stage: e.target.value as PipelineEntry["stage"] })
                        }
                      >
                        {STAGES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeFromPipeline(p.grant.id)}
                        className="btn-ghost text-xs text-ink-faint"
                        aria-label={`Remove ${p.grant.title} from pipeline`}
                        title="Remove from pipeline"
                      >
                        ✕
                      </button>
                    </div>
                    <textarea aria-label={`Notes for ${p.grant.title}`} placeholder="Next step, partner to contact, or submission notes…" value={p.notes || ""} onChange={e => updatePipeline(p.grant.id,{notes:e.target.value})} className="input basis-full min-h-16" />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
