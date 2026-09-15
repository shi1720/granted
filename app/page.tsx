import Link from "next/link";
import { Logo } from "@/components/ui";
import { AGENT_META } from "@/lib/types";
import { searchGrants } from "@/lib/grantsgov";

export const revalidate = 3600;

async function openOpportunityCount(): Promise<number | null> {
  try {
    const { hitCount } = await searchGrants({ rows: 1, oppStatuses: ["posted"] });
    return hitCount;
  } catch {
    return null;
  }
}

const AGENT_ORDER = ["strategist", "writer", "reviewer", "reviser"] as const;

export default async function Landing() {
  const count = await openOpportunityCount();

  return (
    <div className="min-h-screen">
      {/* nav */}
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="#how" className="btn-ghost hidden sm:inline-flex">
            How it works
          </Link>
          <Link href="/onboarding" className="btn-primary">
            Open the app
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-5 pt-14 pb-20 sm:pt-20">
        <div className="max-w-3xl">
          <p className="pill border border-pine-100 bg-pine-50 text-pine-700 animate-fade-up">
            <span className="h-1.5 w-1.5 rounded-full bg-pine-600 pulse-dot" />
            Live Grants.gov data · A team of Claude agents
          </p>
          <h1
            className="font-display mt-6 text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-pine-950 sm:text-6xl animate-fade-up"
            style={{ animationDelay: "60ms" }}
          >
            Every year, small nonprofits leave{" "}
            <span className="text-pine-600">billions in grants</span> on the table.
          </h1>
          <p
            className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            Not because their work isn&apos;t fundable — because grant writers cost more than they
            can afford, and a federal application takes 40+ hours they don&apos;t have. Granted is
            the grants team they could never hire: it finds the grants you can actually win,
            tells you honestly which to skip, and drafts reviewer-critiqued proposals in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 animate-fade-up" style={{ animationDelay: "180ms" }}>
            <Link href="/onboarding" className="btn-primary px-6 py-3 text-base">
              Try it with a real grant
            </Link>
            <Link href="#how" className="btn-secondary px-6 py-3 text-base">
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-faint animate-fade-up" style={{ animationDelay: "220ms" }}>
            No sign-up. Explore with the demo organization in one click.
          </p>
        </div>
      </section>

      {/* live stat band */}
      <section className="border-y border-line bg-paper-deep">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3">
          <div>
            <div className="font-display text-4xl font-semibold text-pine-950">
              {count ? count.toLocaleString() : "Thousands of"}
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              federal opportunities open on Grants.gov <em>right now</em> — this number is live.
            </p>
          </div>
          <div>
            <div className="font-display text-4xl font-semibold text-pine-950">$80–150<span className="text-2xl">/hr</span></div>
            <p className="mt-1 text-sm text-ink-soft">
              typical professional grant-writer rate — out of reach for most small nonprofits.
            </p>
          </div>
          <div>
            <div className="font-display text-4xl font-semibold text-pine-950">40+ hrs</div>
            <p className="mt-1 text-sm text-ink-soft">
              of staff time per federal application. Applying to the wrong grant is the costliest
              mistake in the sector.
            </p>
          </div>
        </div>
      </section>

      {/* the insight */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine-600">The insight</p>
          <h2 className="font-display mt-3 text-3xl font-semibold leading-tight text-pine-950 sm:text-4xl">
            Nonprofits don&apos;t lose grants because they write badly.
            <br className="hidden sm:block" /> They lose because they apply to the{" "}
            <span className="underline decoration-pine-100 decoration-8 underline-offset-4">wrong grants</span>.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            So Granted starts where the money is actually lost: <strong className="text-ink">triage</strong>.
            Before a single word is drafted, its Analyst reads the funder&apos;s real eligibility
            rules and priorities, checks them against your organization, and gives you a
            go/no-go brief with the expected-value math shown. Including — and this is the
            point — an honest <em>&ldquo;skip this one.&rdquo;</em>
          </p>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="border-t border-line bg-card">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine-600">How it works</p>
          <h2 className="font-display mt-3 max-w-xl text-3xl font-semibold leading-tight text-pine-950 sm:text-4xl">
            From mission statement to reviewed draft, in three steps.
          </h2>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <div className="card p-7">
              <div className="font-display text-5xl font-semibold text-pine-100">1</div>
              <h3 className="font-display mt-3 text-xl font-semibold text-pine-950">
                Paste anything about your organization
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                A mission statement, website copy, an annual-report excerpt. Claude extracts a
                structured profile — programs, outcomes, budget, populations served — that every
                agent downstream grounds itself in. Extraction only; it never invents your numbers.
              </p>
            </div>
            <div className="card p-7">
              <div className="font-display text-5xl font-semibold text-pine-100">2</div>
              <h3 className="font-display mt-3 text-xl font-semibold text-pine-950">
                Triage live federal grants
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Granted searches Grants.gov in real time and the Analyst scores each match:
                eligibility as a hard gate, mission alignment, capacity versus award size, and the
                expected value of applying — so your 40 hours go where they can win.
              </p>
            </div>
            <div className="card p-7">
              <div className="font-display text-5xl font-semibold text-pine-100">3</div>
              <h3 className="font-display mt-3 text-xl font-semibold text-pine-950">
                Watch the agent team draft — and critique — your proposal
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                A Strategist plans around the funder&apos;s priorities, a Writer drafts every
                section from your real outcomes, a Reviewer scores it like the funder&apos;s
                panel would, and a Reviser rewrites what got flagged. You watch it happen live.
              </p>
            </div>
          </div>

          {/* agent strip */}
          <div className="mt-14 rounded-2xl border border-pine-100 bg-pine-50/60 p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-display text-lg font-semibold text-pine-950">
                The pipeline behind step 3
              </h3>
              <span className="pill bg-card border border-line text-ink-soft">
                self-correcting · every run is scored before you see it
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {AGENT_ORDER.map((name, i) => (
                <div key={name} className="relative rounded-xl border border-line bg-card p-4">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-pine-700 text-[11px] font-semibold text-paper">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-pine-950">{AGENT_META[name].label}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">{AGENT_META[name].role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* honesty features */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine-600">Built for trust</p>
        <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold leading-tight text-pine-950 sm:text-4xl">
          AI that a grant reviewer — and your board — can trust.
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="card p-6">
            <span className="pill bg-danger-soft text-danger">Skip</span>
            <h3 className="font-display mt-3 text-lg font-semibold text-pine-950">It tells you no.</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              A perfect-sounding grant that excludes nonprofits from eligibility gets an honest
              &ldquo;skip&rdquo; — before you spend a minute on it. Wrong applications are the
              product&apos;s enemy, not its revenue.
            </p>
          </div>
          <div className="card p-6">
            <span className="pill bg-amber-soft text-amber-strong">[ADD: your data]</span>
            <h3 className="font-display mt-3 text-lg font-semibold text-pine-950">It never invents your numbers.</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Every claim in a draft is grounded in your profile. Where a reviewer will want a
              figure you haven&apos;t provided, the Writer leaves a visible{" "}
              <code className="rounded bg-amber-soft px-1 text-xs text-amber-strong">[ADD: …]</code>{" "}
              placeholder instead of hallucinating one.
            </p>
          </div>
          <div className="card p-6">
            <span className="pill bg-pine-50 text-pine-700 border border-pine-100">EV = award × odds − cost</span>
            <h3 className="font-display mt-3 text-lg font-semibold text-pine-950">It shows the math.</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Every recommendation comes with the expected-value calculation behind it — award
              size, conservative win odds, and the true cost of applying — so the decision stays yours.
            </p>
          </div>
        </div>
      </section>

      {/* final CTA */}
      <section className="border-t border-line bg-pine-950">
        <div className="mx-auto max-w-6xl px-5 py-20 text-center">
          <h2 className="font-display mx-auto max-w-2xl text-3xl font-semibold leading-tight text-paper sm:text-4xl">
            The grant your community needs is open right now.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pine-100">
            Load the demo organization and take a real federal opportunity from discovery to a
            reviewed draft — it takes about three minutes.
          </p>
          <Link href="/onboarding" className="btn mt-8 bg-paper px-7 py-3 text-base font-semibold text-pine-950 hover:bg-pine-50">
            Start free
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs text-ink-faint">
        <span>
          Built by Shivam Gupta for the AI Builders Hackathon 2026 · Grant data:{" "}
          <a href="https://grants.gov" className="underline hover:text-pine-700" target="_blank" rel="noreferrer">
            Grants.gov
          </a>{" "}
          public API
        </span>
        <span>Granted drafts; humans decide. Always review before submitting.</span>
      </footer>
    </div>
  );
}
