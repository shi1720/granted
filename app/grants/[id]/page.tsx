"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Nav } from "@/components/nav";
import { DraftStudio } from "@/components/draft-studio";
import { FitBrief } from "@/components/fit-brief";
import { useGranted } from "@/components/store";
import { DeadlinePill, EmptyState, Spinner } from "@/components/ui";
import { ELIGIBILITY_CODES } from "@/lib/grantsgov";
import { formatMoney, formatDate } from "@/lib/format";
import type { GrantDetail } from "@/lib/types";

export default function GrantWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { org, hydrated, fitReports, saveFitReport, pipeline, addToPipeline } = useGranted();
  const [grant, setGrant] = useState<GrantDetail | null>(null);
  const [source, setSource] = useState("live");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [synopsisOpen, setSynopsisOpen] = useState(false);

  const report = fitReports[id];
  const saved = pipeline.some((p) => p.grant.id === id);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the detail view when the URL id changes.
    setLoading(true);
    setError(null);
    setGrant(null);
    fetch(`/api/grants/${id}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Failed to load.");
        if (!cancelled) { setGrant(json.grant); setSource(json.source); }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function analyze() {
    if (!org) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId: id, org }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed.");
      saveFitReport(json.report);
      if (json.warning) setError(json.warning);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="flex items-center justify-center gap-3 py-32 text-ink-faint">
          <Spinner className="h-5 w-5" /> Loading opportunity…
        </div>
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-6xl px-5 py-16">
          <EmptyState
            title="Couldn't load this opportunity"
            body={error ?? "Grants.gov may be briefly unavailable."}
            action={
              <Link href="/discover" className="btn-primary">
                Back to Discover
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  const synopsis = grant.synopsis || "No synopsis published.";
  const synopsisShort = synopsis.length > 480 ? synopsis.slice(0, 480) + "…" : synopsis;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <Link href="/discover" className="text-sm text-ink-faint hover:text-pine-700">
          ← Back to Discover
        </Link>

        {/* header */}
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-pine-950 sm:text-3xl">
              {grant.title}
            </h1>
            <p className="mt-2 text-ink-soft">
              {grant.agency} · <span className="text-ink-faint">{grant.number}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              className="btn-secondary text-xs px-4 py-2"
            >
              {saved ? "✓ In pipeline" : "+ Save to pipeline"}
            </button>
            {grant.externalUrl && (
              <a href={/^https?:\/\//.test(grant.externalUrl) ? grant.externalUrl : `https://www.grants.gov/search-results-detail/${grant.id}`} target="_blank" rel="noreferrer" className="btn-ghost text-xs">
                Full notice ↗
              </a>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <DeadlinePill closeDate={grant.closeDate} />
          <span className="pill border border-line bg-card text-ink-soft">
            Closes {formatDate(grant.closeDate)}
          </span>
          {(grant.awardFloor !== null || grant.awardCeiling !== null) && (
            <span className="pill border border-line bg-card text-ink-soft">
              {grant.awardFloor === null ? "Awards up to " : "Awards "}{grant.awardFloor !== null && `${formatMoney(grant.awardFloor)}–`}{formatMoney(grant.awardCeiling)}
            </span>
          )}
          {grant.costSharing && (
            <span className="pill bg-amber-soft text-amber-strong">Cost sharing required</span>
          )}
          {grant.eligibilityCodes.slice(0, 3).map((c) => (
            <span key={c} className="pill border border-line bg-paper-deep text-ink-faint">
              {ELIGIBILITY_CODES[c] ?? c}
            </span>
          ))}
          {grant.eligibilityCodes.length > 3 && (
            <span className="pill border border-line bg-paper-deep text-ink-faint">
              +{grant.eligibilityCodes.length - 3} applicant types
            </span>
          )}
        </div>

        <p className="mt-4 text-xs text-ink-soft">{source === "snapshot" ? "Saved Grants.gov snapshot. Verify current terms and dates at the source." : "Source: Grants.gov. Confirm eligibility and submission requirements in the full notice."} <a className="underline" target="_blank" rel="noreferrer" href={`https://www.grants.gov/search-results-detail/${grant.id}`}>View source ↗</a></p>
        {error && <p role="alert" className="mt-4 rounded-xl bg-amber-soft p-4 text-sm text-amber-strong">{error}</p>}
        {/* synopsis */}
        <div className="card mt-6 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Funder&apos;s synopsis
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {synopsisOpen ? synopsis : synopsisShort}
          </p>
          {synopsis.length > 480 && (
            <button onClick={() => setSynopsisOpen((v) => !v)} className="mt-2 text-xs font-medium text-pine-700 hover:underline">
              {synopsisOpen ? "Show less" : "Read full synopsis"}
            </button>
          )}
        </div>

        {/* fit brief */}
        <div className="card mt-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-pine-950">Go/no-go brief</h2>
            {org ? (
              <button onClick={analyze} disabled={analyzing} className="btn-secondary text-xs px-4 py-2">
                {analyzing ? (
                  <>
                    <Spinner className="h-3.5 w-3.5" /> Analyst working…
                  </>
                ) : report ? (
                  "Re-run analysis"
                ) : (
                  "Run the Analyst"
                )}
              </button>
            ) : (
              hydrated && (
                <Link href="/onboarding" className="btn-primary text-xs px-4 py-2">
                  Set up your organization first
                </Link>
              )
            )}
          </div>
          {report ? (
            <div className="mt-5">
              <FitBrief report={report} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">
              The Analyst reads this funder&apos;s eligibility rules, priorities, and award economics
              against your profile ; and tells you honestly whether your hours belong here.
            </p>
          )}
        </div>

        {/* drafting studio */}
        <div className="mt-5">
          {org ? (
            <DraftStudio key={grant.id} grant={grant} fit={report ?? null} />
          ) : (
            hydrated && (
              <EmptyState
                title="Drafting needs your organization profile"
                body="The Writer grounds every sentence in your real programs and outcomes ; set up your profile to start."
                action={
                  <Link href="/onboarding" className="btn-primary">
                    Set up your organization
                  </Link>
                }
              />
            )
          )}
        </div>
      </main>
    </div>
  );
}
