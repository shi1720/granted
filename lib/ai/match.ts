import { expectedValue, realisticAward, APPLICATION_COST_USD, eligibilityVerdict, heuristicFitReport } from "../fit";
import type { FitReport, GrantDetail, OrgProfile } from "../types";
import { structured, PROVIDER } from "./client";
import { ANALYST_SYSTEM, grantContext, orgContext } from "./prompts";
import { FitAnalysisSchema } from "./schemas";

/**
 * The Analyst agent: produces a go/no-go brief for one grant × one org.
 * Structured output guarantees the response parses into a FitReport.
 */
export async function analyzeFit(grant: GrantDetail, org: OrgProfile): Promise<FitReport> {
  const gate = eligibilityVerdict(grant, org);
  const baseline = heuristicFitReport(grant, org);
  if (gate.verdict === "ineligible" || (grant.closeDate && new Date(grant.closeDate).getTime() < Date.now() - 86_400_000)) return baseline;
  const response = await structured(FitAnalysisSchema, ANALYST_SYSTEM, `${orgContext(org)}\n\n${grantContext(grant)}\n\nProduce your go/no-go brief for this organization and opportunity.`);

  const a = response.parsed_output;
  if (!a) throw new Error("The Analyst returned an unparseable brief. Try again.");

  if (a.eligibilityVerdict === "ineligible") { a.recommendation = "skip"; a.fitScore = Math.min(a.fitScore, 20); a.winStrategy = []; }
  if (gate.verdict === "unclear" && a.eligibilityVerdict === "eligible") { a.eligibilityVerdict = "unclear"; a.eligibilityReasoning = gate.reasoning + " " + a.eligibilityReasoning; }
  // Expected value is meaningless for an org that can't apply.
  const ev =
    a.eligibilityVerdict === "ineligible"
      ? null
      : expectedValue(grant.awardFloor, grant.awardCeiling, a.winRate);

  return {
    grantId: grant.id,
    fitScore: Math.round(a.fitScore),
    recommendation: a.recommendation,
    eligibility: { verdict: a.eligibilityVerdict, reasoning: a.eligibilityReasoning },
    alignment: { strengths: a.strengths, gaps: a.gaps },
    effort: {
      hoursEstimate: Math.round(a.effortHours),
      complexity: a.effortComplexity,
      reasoning: a.effortReasoning,
    },
    economics: {
      awardFloor: grant.awardFloor,
      awardCeiling: grant.awardCeiling,
      expectedValueUsd: ev,
      reasoning:
        ev !== null
          ? `${a.economicsReasoning} (Assumes ~${Math.round(a.winRate * 100)}% win odds on a realistic award of $${realisticAward(grant.awardFloor, grant.awardCeiling)?.toLocaleString()}, less ~$${APPLICATION_COST_USD.toLocaleString()} to apply.)`
          : a.economicsReasoning,
    },
    verdict: a.verdict,
    winStrategy: a.winStrategy,
    engine: PROVIDER,
    generatedAt: new Date().toISOString(),
  };
}
