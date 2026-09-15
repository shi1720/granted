import Link from "next/link";
import { Logo } from "@/components/ui";
import { searchGrants } from "@/lib/grantsgov";
export const revalidate = 300;
export default async function Landing() {
  let count: number | null = null;
  try { count = (await searchGrants({rows:1,oppStatuses:["posted"]})).hitCount; } catch {}
  return <div className="min-h-screen">
    <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5"><Logo/><div className="flex items-center gap-3"><div className="hidden sm:block"><a href="#how" className="btn-ghost">How it works</a></div><Link href="/onboarding" className="btn-primary">Open workspace ↗</Link></div></header>
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
        <div className="animate-fade-up"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine-600">Small teams. Meaningful missions.</p>
          <h1 className="font-display mt-6 text-5xl font-semibold leading-[1.06] tracking-tight text-pine-950 sm:text-6xl">More time for<br/>your mission.<br/><span className="text-pine-600">A clearer path<br/>to funding.</span></h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">Meet Granted, your AI grants team. Find relevant federal opportunities, know which ones to skip, and turn your real work into a proposal you can review.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/onboarding" className="btn-primary px-6 py-3 text-base">Find your next opportunity →</Link><a href="#how" className="btn-secondary px-6 py-3">Take a look</a></div>
          <p className="mt-4 text-xs text-ink-soft">No account needed · Sample organization included · Your work stays in this browser</p>
        </div>
        <div className="relative animate-fade-up" style={{animationDelay:"100ms"}}>
          <div className="absolute inset-0 lg:-inset-5 rounded-[3rem] bg-pine-100/45 -rotate-3"/>
          <div className="relative card overflow-hidden shadow-pop">
            <div className="flex items-center justify-between border-b border-line bg-paper-deep px-6 py-4"><span className="text-xs font-semibold text-pine-900">YOUR FUNDING WORKSPACE</span><span className="pill bg-card text-ink-soft">Illustrative workflow</span></div>
            <div className="p-6"><p className="text-xs text-ink-faint">01 / DISCOVER & DECIDE</p><h2 className="font-display mt-2 text-2xl font-semibold text-pine-950">The right grant comes first.</h2>
              <div className="mt-5 rounded-xl border border-pine-100 bg-pine-50 p-4"><div className="flex justify-between gap-3"><span className="font-medium">Community reentry program</span><span className="pill bg-pine-700 text-paper">Worth a look</span></div><p className="mt-2 text-sm text-ink-soft">Your programs align. Check the deadline and required partnerships before committing.</p></div>
              <div className="mt-3 rounded-xl border border-line p-4"><div className="flex justify-between gap-3"><span className="font-medium">Government-only opportunity</span><span className="pill bg-danger-soft text-danger">Skip</span></div><p className="mt-2 text-sm text-ink-soft">A strong mission match cannot fix an eligibility mismatch.</p></div>
              <div className="mt-6 border-t border-line pt-5"><p className="text-xs text-ink-faint">02 / BUILD A BETTER DRAFT</p><div className="mt-3 flex flex-wrap gap-2">{["Strategy","Draft","Review","Revise"].map((x,i)=><span key={x} className="pill border border-line bg-card py-1.5 text-pine-900">{i+1}. {x}</span>)}</div><p className="mt-4 rounded-lg bg-amber-soft p-3 text-xs text-amber-strong">[ADD: confirm your program budget]<br/><span className="mt-1 block text-ink-soft">Missing evidence stays visible for you to fill in.</span></p></div>
            </div>
          </div>
        </div>
      </section>
      <section className="border-y border-line bg-paper-deep"><div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:grid-cols-3"><div><strong className="font-display text-3xl text-pine-950">{count === null ? "Grants.gov" : count.toLocaleString()}</strong><p className="mt-1 text-sm text-ink-soft">{count === null ? "Public federal opportunity data, with a labeled offline fallback." : "Posted opportunities on Grants.gov at the latest refresh."}</p></div><div><strong className="font-display text-3xl text-pine-950">One clear decision</strong><p className="mt-1 text-sm text-ink-soft">Eligibility, mission, capacity, effort. Before you draft.</p></div><div><strong className="font-display text-3xl text-pine-950">You stay in control</strong><p className="mt-1 text-sm text-ink-soft">Check the evidence. Edit the narrative. Decide what to submit.</p></div></div></section>
      <section id="how" className="mx-auto max-w-6xl px-5 py-20"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine-600">From possibility to a plan</p><h2 className="font-display mt-3 max-w-2xl text-4xl font-semibold text-pine-950">A grants workflow built around<br className="hidden sm:block"/> the work you already do.</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{[
        ["01","Tell your story","Paste your mission and program outcomes, or try Brightpath, our fictional sample nonprofit. Review the extracted profile before saving."],
        ["02","Choose where to focus","Search federal opportunities. Get an evidence-based fit brief with clear eligibility checks, risks, effort, and explicit planning assumptions."],
        ["03","Make the draft yours","Watch the Strategist, Writer, Reviewer, and Reviser work. Resolve missing facts, edit sections, download the proposal, and track your next steps."]
      ].map(([n,t,b])=><div key={n} className="card p-7"><span className="font-display text-4xl text-pine-600">{n}</span><h3 className="font-display mt-5 text-2xl font-semibold text-pine-950">{t}</h3><p className="mt-3 text-sm leading-relaxed text-ink-soft">{b}</p></div>)}</div></section>
      <section className="bg-pine-950"><div className="mx-auto max-w-6xl px-5 py-16 sm:flex sm:items-center sm:justify-between sm:gap-10"><div><p className="text-xs uppercase tracking-widest text-pine-100">An honest no can save a week.</p><h2 className="font-display mt-3 max-w-xl text-4xl font-semibold text-paper">Good work deserves<br/>a thoughtful application.</h2><p className="mt-4 max-w-xl text-pine-100">Start with a sample nonprofit and explore two real grants: one to consider, and one whose eligibility rules tell you to move on.</p></div><Link href="/onboarding" className="btn mt-7 shrink-0 bg-paper px-7 py-3 font-semibold text-pine-950">Try Granted →</Link></div></section>
    </main>
    <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-5 py-8 text-xs text-ink-soft"><span>Granted · Built by Shivam Gupta</span><span>AI drafts need human review. Funding is never guaranteed.</span><a href="https://www.grants.gov" target="_blank" rel="noreferrer" className="underline">Data from Grants.gov ↗</a></footer>
  </div>;
}
