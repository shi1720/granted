/**
 * Fit economics helpers + the heuristic fit engine.
 *
 * The heuristic engine powers "Analyze fit" when no ANTHROPIC_API_KEY is
 * configured. It is deliberately transparent, deterministic scoring ; not a
 * mock of the AI ; and every report it produces is labeled `engine: "heuristic"`.
 * With a key configured, the Claude Analyst agent replaces it entirely.
 */

import { daysUntil } from "./grantsgov";
import type { FitReport, GrantDetail, OrgProfile, OrgType } from "./types";

/**
 * Which Grants.gov applicant-type codes each org type can apply under.
 * Deliberately excludes "25" (Others) ; funders define "Others" themselves in
 * the eligibility text, and assuming it covers you is exactly the mistake
 * this product exists to prevent. "25" is handled by reading that text.
 */
export const ORG_TYPE_TO_ELIGIBILITY: Record<OrgType, string[]> = {
  nonprofit_501c3: ["12", "99"],
  nonprofit_other: ["13", "99"],
  local_government: [ "01", "02", "04", "99"],
  school_district: ["05", "99"],
  higher_ed: ["06", "20", "99"],
  tribal: ["07", "11", "99"],
  small_business: ["23", "99"],
  other: ["99"],
};

/** Keywords per org type that, appearing in a funder's eligibility text, suggest the "Others" (25) bucket includes them. */
const OTHERS_TEXT_HINTS: Record<OrgType, RegExp> = {
  nonprofit_501c3: /non-?profit|501\s?\(?c\)?|faith-?based|community-?based|non-?governmental|\bngo\b/i,
  nonprofit_other: /non-?profit|faith-?based|community-?based|non-?governmental|\bngo\b/i,
  local_government: /local government|municipalit|county|city|township/i,
  school_district: /school district|local education/i,
  higher_ed: /higher education|college|universit/i,
  tribal: /tribal|tribe|native american|indian/i,
  small_business: /small business|for-?profit/i,
  other: /./,
};

/**
 * Rough win probability for a typical small applicant on a competitive
 * federal opportunity. Deliberately conservative; used only to frame
 * expected value, never presented as a prediction.
 */
export const BASELINE_WIN_RATE = 0.12;

/** Blended cost of a typical federal application at grant-writer market rates. */
export const APPLICATION_COST_USD = 4000;

/** Realistic award size: geometric-ish midpoint biased toward the floor. */
export function realisticAward(floor: number | null, ceiling: number | null): number | null {
  if (ceiling && floor) return Math.round(floor + (ceiling - floor) * 0.4);
  if (ceiling) return Math.round(ceiling * 0.5);
  if (floor) return floor;
  return null;
}

/** Expected value of applying = realistic award × win rate − application cost. */
export function expectedValue(
  floor: number | null,
  ceiling: number | null,
  winRate: number = BASELINE_WIN_RATE,
): number | null {
  const award = realisticAward(floor, ceiling);
  if (award === null) return null;
  return Math.round(award * winRate - APPLICATION_COST_USD);
}

export function eligibilityVerdict(
  grant: GrantDetail,
  org: OrgProfile,
): FitReport["eligibility"] {
  const orgCodes = ORG_TYPE_TO_ELIGIBILITY[org.orgType];
  if (grant.eligibilityCodes.length === 0) {
    return {
      verdict: "unclear",
      reasoning:
        "The funder did not publish structured applicant types. Check the eligibility text before investing time.",
    };
  }
  if (grant.eligibilityCodes.includes("99")) {
    return { verdict: "eligible", reasoning: "Eligibility is unrestricted." };
  }
  const overlap = grant.eligibilityCodes.filter((c) => orgCodes.includes(c));
  if (overlap.length > 0) {
    return {
      verdict: "eligible",
      reasoning: "Your organization type matches the funder's listed applicant types.",
    };
  }
  // The only remaining hope is the "Others" (25) bucket ; but funders define
  // "Others" themselves, so we defer to their eligibility text instead of
  // assuming it covers you.
  if (grant.eligibilityCodes.includes("25")) {
    const desc = grant.eligibilityDesc ?? "";
    if (desc && OTHERS_TEXT_HINTS[org.orgType].test(desc)) {
      return {
        verdict: "unclear",
        reasoning:
          "Your organization type isn't explicitly listed, but the funder's \"Others\" category text mentions organizations like yours ; verify against the full notice before investing time.",
      };
    }
    // A short pointer like "see the full announcement" defines nothing ;
    // treat it as unknown rather than pretending certainty either way.
    const uninformative = desc.length < 120 || /see .*(announcement|notice|section)/i.test(desc);
    if (desc && !uninformative) {
      return {
        verdict: "ineligible",
        reasoning:
          "Your organization type isn't in the funder's applicant list, and their own definition of \"Others\" doesn't mention organizations like yours. Applying would almost certainly be wasted effort.",
      };
    }
    return {
      verdict: "unclear",
      reasoning:
        "The funder lists an \"Others\" category without defining it here. Confirm eligibility in the full notice before investing time.",
    };
  }
  return {
    verdict: "ineligible",
    reasoning:
      "The funder's applicant types do not include organizations like yours. Applying would almost certainly be wasted effort.",
  };
}

/** Keyword overlap between org focus areas/programs and the grant text, 0–1. */
export function textAlignment(grant: GrantDetail, org: OrgProfile): number {
  const grantText = `${grant.title} ${grant.synopsis}`.toLowerCase();
  const terms = new Set<string>();
  for (const area of [...org.focusAreas, ...org.populationsServed]) {
    for (const word of area.toLowerCase().split(/[^a-z]+/)) {
      if (word.length > 3) terms.add(word);
    }
  }
  if (terms.size === 0) return 0;
  let hits = 0;
  for (const t of terms) if (grantText.includes(t)) hits++;
  return hits / terms.size;
}

/**
 * Capacity check: federal grants that dwarf an org's budget are usually
 * unwinnable (funders check organizational capacity); tiny awards may not
 * justify federal compliance overhead.
 */
export function capacityScore(grant: GrantDetail, org: OrgProfile): number {
  const award = realisticAward(grant.awardFloor, grant.awardCeiling);
  if (award === null || org.annualBudgetUsd <= 0) return 0.6; // unknown → neutral
  const ratio = award / org.annualBudgetUsd;
  if (ratio > 2) return 0.15; // award more than 2× annual budget: capacity red flag
  if (ratio > 1) return 0.45;
  if (ratio > 0.05) return 1; // meaningful but manageable
  return 0.5; // tiny relative to budget: real, but overhead-heavy
}

export function heuristicFitReport(grant: GrantDetail, org: OrgProfile): FitReport {
  const eligibility = eligibilityVerdict(grant, org);
  const align = textAlignment(grant, org);
  const capacity = capacityScore(grant, org);
  const categoryOverlap = grant.fundingCategories.filter((c) =>
    org.fundingCategories.includes(c),
  ).length;
  const categoryScore = grant.fundingCategories.length === 0
    ? 0.5
    : Math.min(1, categoryOverlap / Math.min(grant.fundingCategories.length, 2));

  const days = daysUntil(grant.closeDate);
  const deadlineOk = days === null || days >= 14;

  let score: number;
  if (eligibility.verdict === "ineligible") {
    score = Math.round(8 + align * 10);
  } else {
    score = Math.round(
      (eligibility.verdict === "eligible" ? 30 : 18) +
        align * 30 +
        categoryScore * 20 +
        capacity * 20,
    );
    if (!deadlineOk) score = Math.max(5, score - 25);
  }
  score = Math.max(0, Math.min(100, score));

  const expired = days !== null && days < 0;
  if (expired) score = Math.min(score, 15);
  const recommendation: FitReport["recommendation"] =
    expired || eligibility.verdict === "ineligible" || score < 30
      ? "skip"
      : score < 55
        ? "borderline"
        : score < 75
          ? "apply"
          : "strong_apply";

  // Expected value is meaningless for an org that can't apply.
  const ineligible = eligibility.verdict === "ineligible";
  const ev = ineligible || expired ? null : expectedValue(grant.awardFloor, grant.awardCeiling);
  const award = realisticAward(grant.awardFloor, grant.awardCeiling);

  const strengths: string[] = [];
  const gaps: string[] = [];
  if (align > 0.4) strengths.push("Strong keyword overlap between your focus areas and the funder's synopsis.");
  else if (align > 0.15) strengths.push("Partial overlap between your focus areas and the funder's language.");
  else gaps.push("Little overlap between your stated focus areas and the funder's synopsis language.");
  if (categoryOverlap > 0) strengths.push("The opportunity sits in a funding category you selected.");
  if (capacity === 1) strengths.push("Award size is well matched to your organizational budget.");
  if (capacity <= 0.45) gaps.push("Award size is large relative to your annual budget ; funders will question capacity.");
  if (!deadlineOk && days !== null) gaps.push(`Only ${days} day${days === 1 ? "" : "s"} to the deadline ; very tight for a federal application.`);
  if (grant.costSharing) gaps.push("Cost sharing / matching funds are required.");

  const verdictParts: string[] = [];
  if (expired) verdictParts.push("The published deadline has passed. Do not prepare a new application unless the funder confirms an extension.");
  if (eligibility.verdict === "ineligible") {
    verdictParts.push("Skip this one ; your organization type isn't in the funder's eligible applicant list.");
  } else {
    verdictParts.push(
      recommendation === "skip"
        ? "The mission overlap looks too thin to justify a federal application here."
        : recommendation === "borderline"
          ? "Possible, but not obvious ; worth a closer read of the full notice before committing hours."
          : "The alignment and award size look workable for an organization of your scale.",
    );
    if (award) verdictParts.push(`A realistic award is around $${award.toLocaleString()}.`);
  }

  return {
    grantId: grant.id,
    fitScore: score,
    recommendation,
    eligibility,
    alignment: { strengths, gaps },
    effort: {
      hoursEstimate: grant.costSharing ? 60 : 40,
      complexity: grant.costSharing || (award ?? 0) > 500_000 ? "high" : "medium",
      reasoning:
        "Typical federal narrative + budget + registration workload for an opportunity of this size (heuristic estimate).",
    },
    economics: {
      awardFloor: grant.awardFloor,
      awardCeiling: grant.awardCeiling,
      expectedValueUsd: ev,
      reasoning: ineligible
        ? "Not applicable ; the organization isn't eligible to apply."
        : award
          ? `Assumes a ~${Math.round(BASELINE_WIN_RATE * 100)}% win rate for a small applicant and ~$${APPLICATION_COST_USD.toLocaleString()} of staff/consultant time to apply.`
          : "The funder did not publish award amounts, so expected value can't be estimated.",
    },
    verdict: verdictParts.join(" "),
    winStrategy:
      recommendation === "skip"
        ? []
        : [
            "Lead with your most quantified outcome ; federal reviewers score evidence, not adjectives.",
            "Mirror the funder's own vocabulary from the synopsis in your need statement.",
            "Name specific local partners to answer the capacity question before it's asked.",
          ],
    engine: "heuristic",
    generatedAt: new Date().toISOString(),
  };
}
