"use client";

import { useEffect, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { OrgProfileZ } from "@/lib/validate";
import { Nav } from "@/components/nav";
import { Spinner } from "@/components/ui";
import { useGranted } from "@/components/store";
import { DEMO_FREEFORM, DEMO_ORG } from "@/lib/demo";
import { FUNDING_CATEGORIES } from "@/lib/grantsgov";
import { ORG_TYPE_LABELS, type OrgProfile, type OrgType } from "@/lib/types";

const BLANK: OrgProfile = {
  name: "",
  tagline: "",
  mission: "",
  focusAreas: [],
  fundingCategories: [],
  orgType: "nonprofit_501c3",
  annualBudgetUsd: 0,
  staffCount: 0,
  city: "",
  state: "",
  programs: [],
  achievements: [],
  populationsServed: [],
  grantHistory: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { org, setOrg, hydrated, aiStatus } = useGranted();
  const [form, setForm] = useState<OrgProfile>(BLANK);
  const [freeform, setFreeform] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the persisted org arrives after localStorage hydration, post-mount.
    if (hydrated && org) setForm(org);
  }, [hydrated, org]);

  const patch = (p: Partial<OrgProfile>) => setForm((f) => ({ ...f, ...p }));

  async function extract() {
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch(`${aiStatus.apiBase}/api/ai/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: freeform }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Extraction failed.");
      setForm({ ...BLANK, ...json.profile });
      setExtracted(true);
      document.getElementById("profile-form")?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed.");
    } finally {
      setExtracting(false);
    }
  }

  function loadDemo() {
    setForm(DEMO_ORG);
    setExtracted(true);
    setError(null);
    document.getElementById("profile-form")?.scrollIntoView({ behavior: "smooth" });
  }

  function save() {
    if (!form.name.trim() || !form.mission.trim()) {
      setError("At minimum, Granted needs your organization's name and mission.");
      return;
    }
    const validated = OrgProfileZ.safeParse(form);
    if (!validated.success) { setError(validated.error.issues[0]?.message ?? "Please check your profile fields."); return; }
    setOrg(validated.data);
    router.push("/discover");
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-pine-950 sm:text-4xl">
          Tell Granted about your organization
        </h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          This profile grounds every agent downstream ; the Analyst&apos;s go/no-go briefs and the
          Writer&apos;s drafts all build on <em>your</em> real programs and outcomes. Check the extracted facts before saving. Updating your profile starts a fresh workspace.
        </p>

        <p className="mt-3 text-xs text-ink-soft">Brightpath is a fictional sample organization. Its outcomes are examples, not verified real-world results. Your profile is sent to the AI provider only when you request extraction, analysis, or drafting.</p>
        {/* Paste anything */}
        <section className="card mt-8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-pine-950">
              Fastest path: paste anything
            </h2>
            <button onClick={loadDemo} className="btn-secondary text-xs px-4 py-2">
              Or load the demo organization →
            </button>
          </div>
          <p className="mt-1.5 text-sm text-ink-soft">
            Mission statement, website copy, an annual-report excerpt ; AI turns it into a
            structured profile you can edit below.
          </p>
          <textarea
            className="input mt-4 min-h-36 font-mono text-[13px]"
            placeholder="Paste a few paragraphs about your organization…"
            aria-label="Organization background"
            value={freeform}
            onChange={(e) => setFreeform(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={extract}
              disabled={extracting || freeform.trim().length < 80}
              className="btn-primary"
            >
              {extracting ? (
                <>
                  <Spinner /> Extracting profile…
                </>
              ) : (
                "Extract profile with AI"
              )}
            </button>
            <button
              className="btn-ghost text-xs"
              onClick={() => setFreeform(DEMO_FREEFORM)}
            >
              Fill with sample text
            </button>
            {aiStatus.loaded && !aiStatus.aiEnabled && (
              <span className="text-xs text-amber-strong">
                Extraction needs an OPENAI_API_KEY ; or use the demo organization.
              </span>
            )}
          </div>
        </section>

        {/* Manual / extracted form */}
        <section id="profile-form" className="card mt-6 p-6">
          <h2 className="font-display text-xl font-semibold text-pine-950">
            {extracted ? "Review the extracted profile" : "Or build the profile by hand"}
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="organization-name" className="label">Organization name</label>
              <input id="organization-name" className="input" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="organization-type" className="label">Organization type</label>
              <select id="organization-type"
                className="input"
                value={form.orgType}
                onChange={(e) => patch({ orgType: e.target.value as OrgType })}
              >
                {Object.entries(ORG_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="one-line-tagline" className="label">One-line tagline</label>
              <input id="one-line-tagline" className="input" value={form.tagline} onChange={(e) => patch({ tagline: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="mission" className="label">Mission</label>
              <textarea id="mission"
                className="input min-h-24"
                value={form.mission}
                onChange={(e) => patch({ mission: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="city" className="label">City</label>
              <input id="city" className="input" value={form.city} onChange={(e) => patch({ city: e.target.value })} />
            </div>
            <div>
              <label htmlFor="state" className="label">State</label>
              <input id="state" className="input" value={form.state} onChange={(e) => patch({ state: e.target.value })} />
            </div>
            <div>
              <label htmlFor="annual-budget-usd" className="label">Annual budget (USD)</label>
              <input id="annual-budget-usd"
                className="input"
                type="number"
                min={0}
                value={form.annualBudgetUsd || ""}
                onChange={(e) => patch({ annualBudgetUsd: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label htmlFor="staff-count" className="label">Staff count</label>
              <input id="staff-count"
                className="input"
                type="number"
                min={0}
                value={form.staffCount || ""}
                onChange={(e) => patch({ staffCount: Number(e.target.value) || 0 })}
              />
            </div>
            <ListField
              label="Focus areas (one per line)"
              value={form.focusAreas}
              onChange={(v) => patch({ focusAreas: v })}
              placeholder={"youth workforce development\nmentorship"}
            />
            <ListField
              label="Populations served (one per line)"
              value={form.populationsServed}
              onChange={(v) => patch({ populationsServed: v })}
              placeholder={"opportunity youth ages 16–24"}
            />
            <div className="sm:col-span-2">
              <label className="label">Funding categories to watch</label>
              <div className="flex flex-wrap gap-2">
                {FUNDING_CATEGORIES.map((c) => {
                  const on = form.fundingCategories.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() =>
                        patch({
                          fundingCategories: on
                            ? form.fundingCategories.filter((x) => x !== c.code)
                            : [...form.fundingCategories, c.code],
                        })
                      }
                      className={`pill cursor-pointer border transition ${
                        on
                          ? "border-pine-600 bg-pine-50 text-pine-900"
                          : "border-line bg-card text-ink-soft hover:border-pine-600"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <ListField
              className="sm:col-span-2"
              label="Programs (one per line ; be concrete)"
              value={form.programs}
              onChange={(v) => patch({ programs: v })}
              placeholder={"CareerLaunch: a 12-week paid workforce training program…"}
              rows={4}
            />
            <ListField
              className="sm:col-span-2"
              label="Documented outcomes (one per line ; numbers win grants)"
              value={form.achievements}
              onChange={(v) => patch({ achievements: v })}
              placeholder={"Served 340 youth in 2025; 78% completion rate"}
              rows={4}
            />
            <div className="sm:col-span-2">
              <label htmlFor="grant-history-optional" className="label">Grant history (optional)</label>
              <textarea id="grant-history-optional"
                className="input min-h-16"
                value={form.grantHistory}
                onChange={(e) => patch({ grantHistory: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button onClick={save} className="btn-primary px-7 py-3">
              Save & find grants →
            </button>
            {org && (
              <span className="text-xs text-ink-faint">
                Saved locally in your browser ; nothing leaves your machine except analysis requests.
              </span>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function ListField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className = "",
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const fieldId = useId();
  const [text, setText] = useState(value.join("\n"));
  const joined = value.join("\n");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resync only when the parent replaces the list (extraction / demo load).
    if (text.split("\n").map(s => s.trim()).filter(Boolean).join("\n") !== joined) setText(joined);
  }, [joined, text]);
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="label">{label}</label>
      <textarea
        className="input"
        id={fieldId}
        rows={rows}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(
            e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          );
        }}
      />
    </div>
  );
}
