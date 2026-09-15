"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Nav } from "@/components/nav";
import { GrantCard } from "@/components/grant-card";
import { EmptyState, Spinner } from "@/components/ui";
import { useGranted } from "@/components/store";
import { FEATURED_DEMO_GRANT_ID } from "@/lib/demo";
import { FUNDING_CATEGORIES } from "@/lib/grantsgov";
import type { GrantSummary } from "@/lib/types";

export default function DiscoverPage() {
  const { org, hydrated } = useGranted();
  const [keyword, setKeyword] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [hits, setHits] = useState<GrantSummary[] | null>(null);
  const [hitCount, setHitCount] = useState(0);
  const [source, setSource] = useState<"live" | "snapshot">("live");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(false);

  const search = useCallback(
    async (kw: string, cats: string[]) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/grants/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: kw, fundingCategories: cats, rows: 25 }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Search failed.");
        // Surface the featured demo opportunity first when present.
        const sorted = [...json.hits].sort((a: GrantSummary, b: GrantSummary) =>
          a.id === FEATURED_DEMO_GRANT_ID ? -1 : b.id === FEATURED_DEMO_GRANT_ID ? 1 : 0,
        );
        setHits(sorted);
        setHitCount(json.hitCount);
        setSource(json.source);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Seed the first search from the org profile.
  useEffect(() => {
    if (!hydrated || seeded.current) return;
    seeded.current = true;
    const kw = org?.focusAreas[0] ?? "";
    const cats = org?.fundingCategories ?? [];
    setKeyword(kw);
    setCategories(cats);
    search(kw, cats);
  }, [hydrated, org, search]);

  if (hydrated && !org) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-6xl px-5 py-16">
          <EmptyState
            title="First, tell Granted who you are"
            body="The Analyst can't judge fit without knowing your organization. Set up your profile — or load the demo org — and come back."
            action={
              <Link href="/onboarding" className="btn-primary">
                Set up your organization
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-pine-950 sm:text-4xl">
              Discover grants
            </h1>
            <p className="mt-2 text-ink-soft">
              Live federal opportunities from Grants.gov, triaged for{" "}
              <span className="font-medium text-ink">{org?.name ?? "your organization"}</span>.
            </p>
          </div>
          {hits && (
            <span className={`pill ${source === "live" ? "bg-pine-50 text-pine-700 border border-pine-100" : "bg-amber-soft text-amber-strong"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${source === "live" ? "bg-pine-600 pulse-dot" : "bg-amber-strong"}`} />
              {source === "live" ? `Live · ${hitCount.toLocaleString()} matches` : "Offline snapshot"}
            </span>
          )}
        </div>

        {/* search controls */}
        <form
          className="card mt-6 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            search(keyword, categories);
          }}
        >
          <div className="flex flex-wrap gap-3">
            <input
              className="input flex-1 min-w-56"
              placeholder="Search keywords — e.g. youth workforce, food access, housing…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Spinner /> : "Search"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {FUNDING_CATEGORIES.map((c) => {
              const on = categories.includes(c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    const next = on
                      ? categories.filter((x) => x !== c.code)
                      : [...categories, c.code];
                    setCategories(next);
                    search(keyword, next);
                  }}
                  className={`pill cursor-pointer border transition ${
                    on
                      ? "border-pine-600 bg-pine-50 text-pine-900"
                      : "border-line bg-card text-ink-faint hover:border-pine-600 hover:text-pine-700"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </form>

        {error && (
          <p className="mt-6 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}

        {/* results */}
        <div className="mt-6 space-y-4">
          {loading && !hits && (
            <div className="flex items-center justify-center gap-3 py-20 text-ink-faint">
              <Spinner className="h-5 w-5" /> Searching Grants.gov…
            </div>
          )}
          {hits?.map((g, i) => (
            <div key={g.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
              <GrantCard grant={g} featured={g.id === FEATURED_DEMO_GRANT_ID} />
            </div>
          ))}
          {hits && hits.length === 0 && (
            <EmptyState
              title="No open opportunities matched"
              body="Try broader keywords or fewer category filters — federal titles are often bureaucratic."
            />
          )}
        </div>
      </main>
    </div>
  );
}
