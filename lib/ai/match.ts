import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { expectedValue, realisticAward, APPLICATION_COST_USD } from "../fit";
import type { FitReport, GrantDetail, OrgProfile } from "../types";
import { MODEL, anthropic } from "./client";
import { ANALYST_SYSTEM, grantContext, orgContext } from "./prompts";
import { FitAnalysisSchema } from "./schemas";

/**
 * The Analyst agent: produces a go/no-go brief for one grant × one org.
 * Structured output guarantees the response parses into a FitReport.
 */
export async function analyzeFit(grant: GrantDetail, org: OrgProfile): Promise<FitReport> {
  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: ANALYST_SYSTEM,
    messages: [
      {
        role: "user",
        content: `${orgContext(org)}\n\n${grantContext(grant)}\n\nProduce your go/no-go brief for this organization and this opportunity.`,
      },
    ],
    output_config: { format: zodOutputFormat(FitAnalysisSchema) },
  });

  const a = response.parsed_output;
  if (!a) throw new Error("The Analyst returned an unparseable brief. Try again.");

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
    engine: "claude",
    generatedAt: new Date().toISOString(),
  };
}
