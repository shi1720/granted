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
