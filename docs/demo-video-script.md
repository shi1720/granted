# Demo Video Script — Granted (≤ 5:00)

**Format:** screen recording with voiceover. Read the VOICE lines verbatim — they're paced
for ~4:40 at a natural speaking speed, leaving buffer.
**Setup before recording:** `ANTHROPIC_API_KEY` set (live mode), browser at
`localhost:3000`, localStorage cleared (fresh state), window ~1440px wide.
If you must record without a key, the demo-mode replay follows the identical flow — say
"pipeline" instead of "Claude" nowhere changes.

> **Recording tip:** record the draft pipeline segment in real time and speed it up 2–4× in
> the edit, keeping the section text readable. Keep your cursor calm; move it only when
> you're about to click.

---

### [0:00–0:35] The problem — over the landing page, scroll slowly

**SCREEN:** Landing page hero. Pause on the live counter band.

**VOICE:**
"There are almost two million nonprofits in the United States, and most of them are tiny —
a food pantry, a youth program, a shelter. Right now, on Grants.gov, there are — you can
see the live number — hundreds of open federal funding opportunities meant for exactly
these organizations. And most of that money will go to whoever could afford a grant
writer. Professional grant writers charge up to a hundred and fifty dollars an hour. A
single federal application takes forty-plus hours. So the smallest organizations — the
ones doing the hardest work — are locked out of money that was set aside for them.

This is Granted: the AI grants team they could never hire."

---

### [0:35–1:05] The insight + profile — onboarding page

**SCREEN:** Click **Open the app**. On Organization page, click **"Fill with sample
text"**, then **"Extract profile with Claude"**. The structured profile appears; scroll it
briefly. Click **Save & find grants**.

**VOICE:**
"Here's the insight the industry misses: nonprofits don't lose grants because they write
badly. They lose because they apply to the wrong grants — and run out of time.

So Granted starts by understanding the organization. I paste anything — a mission
statement, website copy — and Claude extracts a structured profile: real programs, real
outcomes, real budget. Extraction only. It never invents our numbers. This profile is what
every agent downstream grounds itself in."

---

### [1:05–2:05] Triage — the honest analyst

**SCREEN:** Discover page loads with live results and the "Live" badge. Point at the badge.
Click **Analyze fit** on the *featured* Second Chance Act grant; when the brief opens,
hover the eligibility pill → strengths → expected value. Then scroll to **Smart Reentry**,
click **Analyze fit**, and let the red "Skip / Not eligible" verdict land on screen.

**VOICE:**
"Discovery is live — this is the real Grants.gov API, these deadlines are real. But search
was never the hard part. The hard part is knowing where your forty hours can actually win.

For each grant, Granted's Analyst reads the funder's eligibility rules, priorities, and
award economics against our profile, and produces a go-slash-no-go brief. Fit score.
Eligibility as a hard gate. Estimated effort. And the expected-value math, shown — award
size, times conservative win odds, minus what it costs to apply.

And here's the part I care about most. This second grant — Smart Reentry — looks like a
perfect mission fit for us. Granted says: skip it. The eligible-applicant list is
governments only — nonprofits can't apply. That one honest 'no' just saved this
organization a month of wasted capacity. An AI tool that only ever says yes is a demo.
One that says no is a product you can trust."

---

### [2:05–3:50] The drafting pipeline — the wow

**SCREEN:** Open the featured grant's workspace. Quick glance at the header (deadline
countdown, award range, eligibility pills). Click **Start drafting with Claude**. Show the
agent timeline lighting up: Strategist card, then the "Strategist's read on this funder"
panel — pause on it. Sections stream in (sped up in edit). Reviewer posts the score and
notes. Reviser rewrites; click **"Revised — view original"** to flash the before/after.
End on the two score dials (e.g. 74 → 88).

**VOICE:**
"Now the part that used to cost five thousand dollars. This is a real Bureau of Justice
Assistance opportunity — up to a million dollars, closing in days.

Watch the team work. First, the Strategist reads what this funder is actually buying —
look at its read: credentialed training, measurable placement, reduced recidivism — and
plans the narrative around those priorities.

Then the Writer drafts every section, live — grounded in our real outcomes. And where a
reviewer will want a number we haven't provided, it doesn't make one up. It leaves a
visible ADD placeholder. In federal grant writing, an invented statistic isn't a typo —
it's disqualifying. Honesty here is a feature.

Then — and this is what makes it a team, not a template — the Reviewer scores the draft
the way the funder's own panel would. Seventy-four out of a hundred, with specific,
critical notes. The Reviser rewrites exactly what got flagged... and the panel rescores:
eighty-eight. You can see the before and after of every revised section.

Draft, critique, revision, rescore — in about three minutes, for about forty cents of
compute."

---

### [3:50–4:20] Pipeline + export

**SCREEN:** Click **Download .md** (show the exported file for a beat). Navigate to
**Pipeline**: the board with deadline sorting and the combined expected-value stat.

**VOICE:**
"The draft exports ready for staff to finish — every placeholder is a to-do, not a trap.
And the pipeline board keeps the whole grants operation honest: what's due first, what's
drafted, and the combined expected value of everything we're chasing."

---

### [4:20–4:55] Close

**SCREEN:** Back to the landing page; end on the tagline / final CTA.

**VOICE:**
"Under the hood: live Grants.gov data, five Claude agents with structured outputs,
streaming end to end, tested down to the failure cases — and it degrades gracefully even
with no API key at all.

A fit brief costs pennies. A reviewed draft costs cents. A grant writer costs thousands —
if you can find one. That's not a demo economics story; that's a forty-nine-dollar-a-month
product with software margins, for one point eight million organizations.

The grant your community needs is open right now. Granted makes sure you don't miss it.
Thanks for watching."

---

## Shot checklist

- [ ] Fresh localStorage before recording (`localStorage.clear()` in devtools)
- [ ] Live counter visible on landing (0:10)
- [ ] "Claude live" badge in nav visible when the app opens (1:05)
- [ ] The Smart Reentry "skip" verdict fully on screen for ≥3 s (1:50)
- [ ] Strategist's funder-read panel on screen for ≥4 s (2:25)
- [ ] An `[ADD: …]` placeholder visibly highlighted during writing (3:00)
- [ ] Score dials 74 → 88 (or that run's numbers) on screen at (3:40)
- [ ] Speed up only the streaming; keep clicks and verdicts real-time
