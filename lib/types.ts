/**
 * Core domain types for Granted — the AI grants team for small nonprofits.
 */

/** A nonprofit's organizational profile. Built once, reused by every agent. */
export interface OrgProfile {
  name: string;
  /** One-line description of what the organization does. */
  tagline: string;
  mission: string;
  /** Plain-language focus areas, e.g. "youth workforce development". */
  focusAreas: string[];
  /** Grants.gov funding category codes this org maps to (see FUNDING_CATEGORIES). */
  fundingCategories: string[];
  orgType: OrgType;
  annualBudgetUsd: number;
  staffCount: number;
  city: string;
  state: string;
  yearFounded?: number;
  /** Key programs, described concretely. */
  programs: string[];
  /** Measurable outcomes and achievements — the Writer agent's raw material. */
  achievements: string[];
  populationsServed: string[];
  /** Freeform notes on past grants won or applied for. */
  grantHistory: string;
}

export type OrgType =
  | "nonprofit_501c3"
  | "nonprofit_other"
  | "local_government"
  | "school_district"
  | "higher_ed"
  | "tribal"
  | "small_business"
  | "other";

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  nonprofit_501c3: "501(c)(3) nonprofit",
  nonprofit_other: "Nonprofit (non-501(c)(3))",
  local_government: "Local government",
  school_district: "School district",
  higher_ed: "Higher education",
  tribal: "Tribal organization",
  small_business: "Small business",
  other: "Other",
};

/** A grant opportunity as returned by Grants.gov search. */
export interface GrantSummary {
  id: string;
  number: string;
  title: string;
  agency: string;
  agencyCode: string;
  openDate: string | null;
  closeDate: string | null;
  status: string;
  cfdaList: string[];
}

/** Full opportunity detail from Grants.gov fetchOpportunity. */
export interface GrantDetail extends GrantSummary {
  synopsis: string;
  awardFloor: number | null;
  awardCeiling: number | null;
  expectedAwards: number | null;
  totalFunding: number | null;
  eligibilityDesc: string;
  eligibilityCodes: string[];
  costSharing: boolean;
  fundingCategories: string[];
  fundingInstruments: string[];
  contactEmail: string | null;
  contactName: string | null;
  externalUrl: string | null;
}

/** The Analyst agent's go/no-go brief for one grant × one org. */
export interface FitReport {
  grantId: string;
  /** 0–100. Weighted blend of eligibility, mission alignment, capacity, and economics. */
  fitScore: number;
  recommendation: "strong_apply" | "apply" | "borderline" | "skip";
  eligibility: {
    verdict: "eligible" | "ineligible" | "unclear";
    reasoning: string;
  };
  alignment: {
    strengths: string[];
    gaps: string[];
  };
  effort: {
    hoursEstimate: number;
    complexity: "low" | "medium" | "high";
    reasoning: string;
  };
  economics: {
    awardFloor: number | null;
    awardCeiling: number | null;
    /** Realistic award × rough win probability − cost of applying. */
    expectedValueUsd: number | null;
    reasoning: string;
  };
  /** Plain-English verdict a busy executive director can act on in 20 seconds. */
  verdict: string;
  /** If applying: the angles most likely to win with this specific funder. */
  winStrategy: string[];
  /** "claude" for live AI analysis, "heuristic" for the no-key fallback engine. */
  engine: "claude" | "heuristic";
  generatedAt: string;
}

export const RECOMMENDATION_LABELS: Record<FitReport["recommendation"], string> = {
  strong_apply: "Strong apply",
  apply: "Apply",
  borderline: "Borderline",
  skip: "Skip",
};

/** One section of a drafted proposal. */
export interface ProposalSection {
  id: string;
  title: string;
  content: string;
}

/** A note from the Reviewer agent, scored against the funder's own criteria. */
export interface ReviewNote {
  sectionId: string;
  severity: "critical" | "important" | "polish";
  issue: string;
  fix: string;
}

export interface Proposal {
  grantId: string;
  grantTitle: string;
  orgName: string;
  title: string;
  sections: ProposalSection[];
  reviewNotes: ReviewNote[];
  /** Reviewer's score of the draft before and after revision, 0–100. */
  scoreBefore: number | null;
  scoreAfter: number | null;
  generatedAt: string;
  engine: "claude" | "demo";
  /** Measured token usage across the pipeline's model calls (live runs only). */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    /** Computed from list prices when the model is known, else null. */
    costUsd: number | null;
    model: string;
  };
}

/** Agents in the drafting pipeline, in execution order. */
export type AgentName = "strategist" | "writer" | "reviewer" | "reviser";

export const AGENT_META: Record<AgentName, { label: string; role: string }> = {
  strategist: { label: "Strategist", role: "Reads the funder's priorities and plans the proposal structure" },
  writer: { label: "Writer", role: "Drafts every section grounded in your organization's real outcomes" },
  reviewer: { label: "Reviewer", role: "Scores the draft the way the funder's review panel would" },
  reviser: { label: "Reviser", role: "Rewrites the weakest sections to address the review" },
};

/** Server-sent events emitted by the drafting pipeline. */
export type DraftEvent =
  | { type: "agent_start"; agent: AgentName; message: string }
  | { type: "agent_done"; agent: AgentName; message: string }
  | { type: "plan"; title: string; sections: { id: string; title: string }[]; strategy: string }
  | { type: "section_start"; sectionId: string; title: string }
  | { type: "section_delta"; sectionId: string; text: string }
  | { type: "section_done"; sectionId: string }
  | { type: "review"; notes: ReviewNote[]; score: number }
  | { type: "revision_start"; sectionId: string }
  | { type: "revision_delta"; sectionId: string; text: string }
  | { type: "revision_done"; sectionId: string }
  | { type: "done"; proposal: Proposal }
  | { type: "error"; message: string };

/** A grant saved to the user's pipeline. */
export interface PipelineEntry {
  grant: GrantSummary;
  stage: "researching" | "drafting" | "ready" | "submitted";
  fitScore?: number;
  recommendation?: FitReport["recommendation"];
  savedAt: string;
  notes?: string;
}
