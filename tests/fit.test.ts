import { describe, expect, it } from "vitest";
import {
  capacityScore,
  eligibilityVerdict,
  expectedValue,
  heuristicFitReport,
  realisticAward,
} from "../lib/fit";
import type { GrantDetail, OrgProfile } from "../lib/types";

const org: OrgProfile = {
  name: "Test Youth Org",
  tagline: "Youth workforce training",
  mission: "Workforce development for opportunity youth",
  focusAreas: ["youth workforce development", "reentry"],
  fundingCategories: ["ELT", "LJL"],
  orgType: "nonprofit_501c3",
  annualBudgetUsd: 1_200_000,
  staffCount: 11,
  city: "Columbus",
  state: "OH",
  programs: ["Paid job training for youth"],
  achievements: ["Served 340 youth"],
  populationsServed: ["justice-involved young adults"],
  grantHistory: "",
};

function grant(overrides: Partial<GrantDetail>): GrantDetail {
  return {
    id: "1",
    number: "TEST-1",
    title: "Youth Reentry Employment Program",
    agency: "Test Agency",
    agencyCode: "TA",
    openDate: null,
    closeDate: "Jan 25, 2027 12:00:00 AM EST",
    status: "posted",
    cfdaList: [],
    synopsis: "Supports workforce development and employment for justice-involved youth reentry.",
    awardFloor: 100_000,
    awardCeiling: 500_000,
    expectedAwards: null,
    totalFunding: null,
    eligibilityDesc: "",
    eligibilityCodes: ["12", "13"],
    costSharing: false,
    fundingCategories: ["LJL"],
    fundingInstruments: ["Grant"],
    contactEmail: null,
    contactName: null,
    externalUrl: null,
    ...overrides,
  };
}

describe("eligibilityVerdict", () => {
  it("passes a 501(c)(3) on a grant listing code 12", () => {
    expect(eligibilityVerdict(grant({}), org).verdict).toBe("eligible");
  });
  it("fails a 501(c)(3) on a government-only grant", () => {
    expect(eligibilityVerdict(grant({ eligibilityCodes: ["00", "01", "07"] }), org).verdict).toBe(
      "ineligible",
    );
  });
  it("treats unrestricted (99) as eligible", () => {
    expect(eligibilityVerdict(grant({ eligibilityCodes: ["99"] }), org).verdict).toBe("eligible");
  });
  it("is unclear when the funder published no applicant types", () => {
    expect(eligibilityVerdict(grant({ eligibilityCodes: [] }), org).verdict).toBe("unclear");
  });
  it('never assumes "Others" (25) covers a nonprofit when the funder defines it otherwise', () => {
    const r = eligibilityVerdict(
      grant({
        eligibilityCodes: ["00", "01", "25"],
        eligibilityDesc:
          "Other units of local government: For the purposes of this notice of funding opportunity, other units of local government include towns, boroughs, parishes, villages, or other general purpose political subdivisions of a state.",
      }),
      org,
    );
    expect(r.verdict).toBe("ineligible");
  });
  it('flags "Others" (25) as unclear when the funder\'s text mentions nonprofits', () => {
    const r = eligibilityVerdict(
      grant({
        eligibilityCodes: ["25", "00"],
        eligibilityDesc:
          "Nonprofit or for-profit mental health agencies or other non-governmental applicants are eligible to apply if designated by the state authority.",
      }),
      org,
    );
    expect(r.verdict).toBe("unclear");
  });
  it('treats an uninformative "Others" definition as unclear, not ineligible', () => {
    const r = eligibilityVerdict(
      grant({
        eligibilityCodes: ["25"],
        eligibilityDesc: "See Section 2 of the full announcement for eligibility information.",
      }),
      org,
    );
    expect(r.verdict).toBe("unclear");
  });
});

describe("the honesty test (real snapshot data)", () => {
  // These pin the demo flow judges are directed through in docs/JUDGES.md.
  it("BJA Smart Reentry (363588): perfect mission fit, but nonprofits are NOT eligible → skip", async () => {
    const grants = (await import("../lib/demo-grants.json")).default as unknown as GrantDetail[];
    const smartReentry = grants.find((g) => g.id === "363588")!;
    const report = heuristicFitReport(smartReentry, org);
    expect(report.eligibility.verdict).toBe("ineligible");
    expect(report.recommendation).toBe("skip");
    // No expected value on a grant the org can't apply to.
    expect(report.economics.expectedValueUsd).toBeNull();
  });
  it("BJA Second Chance Act (363637): featured demo grant is eligible for a 501(c)(3)", async () => {
    const grants = (await import("../lib/demo-grants.json")).default as unknown as GrantDetail[];
    const featured = grants.find((g) => g.id === "363637")!;
    const report = heuristicFitReport(featured, org);
    expect(report.eligibility.verdict).toBe("eligible");
    expect(report.recommendation).not.toBe("skip");
  });
});

describe("award economics", () => {
  it("realistic award sits between floor and ceiling, biased low", () => {
    const award = realisticAward(100_000, 500_000)!;
    expect(award).toBeGreaterThan(100_000);
    expect(award).toBeLessThan(300_000);
  });
  it("expected value nets out application cost", () => {
    const ev = expectedValue(100_000, 500_000, 0.12)!;
    expect(ev).toBe(Math.round((100_000 + 400_000 * 0.4) * 0.12 - 4000));
  });
  it("returns null when no award data exists", () => {
    expect(expectedValue(null, null)).toBeNull();
  });
});

describe("capacityScore", () => {
  it("flags awards that dwarf the org budget", () => {
    expect(capacityScore(grant({ awardFloor: null, awardCeiling: 10_000_000 }), org)).toBeLessThan(
      0.5,
    );
  });
  it("rewards right-sized awards", () => {
    expect(capacityScore(grant({}), org)).toBe(1);
  });
});

describe("heuristicFitReport", () => {
  it("hard-gates ineligible orgs to skip regardless of mission fit", () => {
    const r = heuristicFitReport(grant({ eligibilityCodes: ["00", "01"] }), org);
    expect(r.recommendation).toBe("skip");
    expect(r.fitScore).toBeLessThan(30);
    expect(r.winStrategy).toHaveLength(0);
  });
  it("recommends applying for an aligned, eligible, right-sized grant", () => {
    const r = heuristicFitReport(grant({}), org);
    expect(["apply", "strong_apply"]).toContain(r.recommendation);
    expect(r.engine).toBe("heuristic");
    expect(r.economics.expectedValueUsd).not.toBeNull();
  });
  it("penalizes very tight deadlines", () => {
    const soon = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const relaxed = heuristicFitReport(grant({}), org);
    const rushed = heuristicFitReport(grant({ closeDate: soon }), org);
    expect(rushed.fitScore).toBeLessThan(relaxed.fitScore);
  });
});
