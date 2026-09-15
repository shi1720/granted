import { z } from "zod";

/**
 * Zod schemas for every structured output in the pipeline.
 * These are passed to Claude via zodOutputFormat, so the model's answers
 * are guaranteed to parse into exactly these shapes.
 */

export const FitAnalysisSchema = z.object({
  fitScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Overall fit 0-100. Weigh eligibility (hard gate), mission alignment, organizational capacity vs award size, and economics. Scores above 75 should be rare and mean 'drop other work and apply'.",
    ),
  recommendation: z.enum(["strong_apply", "apply", "borderline", "skip"]),
  eligibilityVerdict: z.enum(["eligible", "ineligible", "unclear"]),
  eligibilityReasoning: z
    .string()
    .describe("Cite the funder's actual applicant-type language. One or two sentences."),
  strengths: z
    .array(z.string())
    .max(4)
    .describe("Specific reasons this org fits this funder. Concrete, not generic."),
  gaps: z
    .array(z.string())
    .max(4)
    .describe("Specific weaknesses or risks a reviewer would flag."),
  effortHours: z
    .number()
    .describe("Realistic staff hours to produce a competitive application."),
  effortComplexity: z.enum(["low", "medium", "high"]),
  effortReasoning: z.string(),
  winRate: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Rough probability THIS org wins if it applies, considering fit and typical federal competition. Be conservative; 0.05-0.25 is the usual range.",
    ),
  economicsReasoning: z
    .string()
    .describe("One or two sentences on whether the award justifies the effort."),
  verdict: z
    .string()
    .describe(
      "2-3 plain-English sentences a busy executive director can act on in 20 seconds. Direct, warm, zero jargon. Say apply or skip and why.",
    ),
  winStrategy: z
    .array(z.string())
    .max(4)
    .describe(
      "If applying: the specific angles most likely to win with THIS funder — which org strengths to lead with, which funder priorities to mirror. Empty if skipping.",
    ),
});
export type FitAnalysis = z.infer<typeof FitAnalysisSchema>;

export const PlanSchema = z.object({
  proposalTitle: z
    .string()
    .describe("A compelling, specific project title. Not the org name, not the grant name."),
  strategy: z
    .string()
    .describe(
      "3-4 sentences: what this funder actually cares about (from the synopsis), and the through-line the proposal will use to win. Written to brief the Writer.",
    ),
  sections: z
    .array(
      z.object({
        id: z
          .string()
          .regex(/^[a-z0-9_]+$/)
          .describe("snake_case slug, e.g. statement_of_need"),
        title: z.string(),
        guidance: z
          .string()
          .describe(
            "2-3 sentences telling the Writer exactly what this section must accomplish and which org facts to use.",
          ),
        wordTarget: z.number().describe("Target length in words, 150-450."),
      }),
    )
    .min(5)
    .max(7)
    .describe("Standard federal narrative arc adapted to this specific opportunity."),
});
export type Plan = z.infer<typeof PlanSchema>;

export const ReviewSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("How a federal review panel would score this draft against the funder's stated priorities."),
  summary: z
    .string()
    .describe("2-3 sentences: overall verdict in the voice of a seasoned grant reviewer."),
  notes: z
    .array(
      z.object({
        sectionId: z.string().describe("The id of the section this note applies to."),
        severity: z.enum(["critical", "important", "polish"]),
        issue: z.string().describe("What a reviewer would penalize, specifically."),
        fix: z.string().describe("The concrete change that would fix it."),
      }),
    )
    .max(8),
});
export type Review = z.infer<typeof ReviewSchema>;

export const RescoreSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string().describe("One sentence on whether the revision resolved the flagged issues."),
});
export type Rescore = z.infer<typeof RescoreSchema>;

export const ExtractedProfileSchema = z.object({
  name: z.string(),
  tagline: z.string().describe("One-line description of what the organization does."),
  mission: z.string(),
  focusAreas: z.array(z.string()).max(6),
  fundingCategories: z
    .array(z.string())
    .max(4)
    .describe(
      "Grants.gov category codes from this exact list: AG AR BC CD DPR ED ELT EN ENV FN HL HO HU ISS LJL NR RD ST T O",
    ),
  orgType: z.enum([
    "nonprofit_501c3",
    "nonprofit_other",
    "local_government",
    "school_district",
    "higher_ed",
    "tribal",
    "small_business",
    "other",
  ]),
  annualBudgetUsd: z.number().describe("Best estimate; 0 if truly unknown."),
  staffCount: z.number().describe("Best estimate; 0 if truly unknown."),
  city: z.string(),
  state: z.string().describe("Two-letter US state code if determinable, else empty string."),
  yearFounded: z.number().nullable(),
  programs: z.array(z.string()).max(5).describe("Concrete program descriptions found in the text."),
  achievements: z
    .array(z.string())
    .max(5)
    .describe("Quantified outcomes if present. Never invent numbers — only extract what's stated."),
  populationsServed: z.array(z.string()).max(5),
  grantHistory: z.string().describe("Any mentioned past grants/funders, else empty string."),
});
export type ExtractedProfile = z.infer<typeof ExtractedProfileSchema>;
