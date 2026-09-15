/**
 * Thin, typed client for the public Grants.gov REST API.
 * No API key required — this is live US federal grant data.
 * Docs: https://grants.gov/api/
 */

import type { GrantDetail, GrantSummary } from "./types";

const BASE = "https://api.grants.gov/v1/api";

/** Grants.gov applicant eligibility codes (subset relevant to Granted's users). */
export const ELIGIBILITY_CODES: Record<string, string> = {
  "00": "State governments",
  "01": "County governments",
  "02": "City or township governments",
  "04": "Special district governments",
  "05": "Independent school districts",
  "06": "Public institutions of higher education",
  "07": "Federally recognized Native American tribal governments",
  "08": "Public/Indian housing authorities",
  "11": "Native American tribal organizations (other)",
  "12": "501(c)(3) nonprofits (non-higher-ed)",
  "13": "Nonprofits without 501(c)(3) (non-higher-ed)",
  "20": "Private institutions of higher education",
  "21": "Individuals",
  "22": "For-profit organizations (non-small-business)",
  "23": "Small businesses",
  "25": "Others",
  "99": "Unrestricted",
};

/** Grants.gov funding category codes shown to users as plain-language interest areas. */
export const FUNDING_CATEGORIES: { code: string; label: string }[] = [
  { code: "AG", label: "Agriculture" },
  { code: "AR", label: "Arts" },
  { code: "BC", label: "Business & Commerce" },
  { code: "CD", label: "Community Development" },
  { code: "DPR", label: "Disaster Prevention & Relief" },
  { code: "ED", label: "Education" },
  { code: "ELT", label: "Employment & Training" },
  { code: "EN", label: "Energy" },
  { code: "ENV", label: "Environment" },
  { code: "FN", label: "Food & Nutrition" },
  { code: "HL", label: "Health" },
  { code: "HO", label: "Housing" },
  { code: "HU", label: "Humanities" },
  { code: "ISS", label: "Income Security & Social Services" },
  { code: "LJL", label: "Law & Justice" },
  { code: "NR", label: "Natural Resources" },
  { code: "RD", label: "Regional Development" },
  { code: "ST", label: "Science & Technology" },
  { code: "T", label: "Transportation" },
  { code: "O", label: "Other" },
];

export interface SearchParams {
  keyword?: string;
  fundingCategories?: string[];
  eligibilities?: string[];
  agencies?: string[];
  oppStatuses?: string[];
  rows?: number;
  startRecordNum?: number;
}

interface RawOppHit {
  id: number | string;
  number: string;
  title: string;
  agency: string;
  agencyCode: string;
  openDate?: string;
  closeDate?: string;
  oppStatus: string;
  cfdaList?: string[];
}

/** Strip stray HTML entities Grants.gov sometimes leaves in titles. */
export function cleanTitle(raw: string): string {
  return raw
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse Grants.gov money strings ("1,000,000", "none", "") into numbers. */
export function parseMoney(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).replace(/[$,\s]/g, "");
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function searchGrants(params: SearchParams): Promise<{
  hits: GrantSummary[];
  hitCount: number;
}> {
  const body = {
    keyword: params.keyword ?? "",
    rows: params.rows ?? 20,
    startRecordNum: params.startRecordNum ?? 0,
    oppStatuses: (params.oppStatuses ?? ["forecasted", "posted"]).join("|"),
    fundingCategories: (params.fundingCategories ?? []).join("|"),
    eligibilities: (params.eligibilities ?? []).join("|"),
    agencies: (params.agencies ?? []).join("|"),
  };

  const res = await fetch(`${BASE}/search2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // Grant listings change slowly; a short cache keeps the UI snappy.
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Grants.gov search failed: HTTP ${res.status}`);
  const json = await res.json();
  if (json.errorcode !== 0) throw new Error(`Grants.gov search error: ${json.msg}`);

  const hits: GrantSummary[] = (json.data.oppHits ?? []).map((h: RawOppHit) => ({
    id: String(h.id),
    number: h.number,
    title: cleanTitle(h.title),
    agency: h.agency,
    agencyCode: h.agencyCode,
    openDate: h.openDate ?? null,
    closeDate: h.closeDate ?? null,
    status: h.oppStatus,
    cfdaList: h.cfdaList ?? [],
  }));

  return { hits, hitCount: json.data.hitCount ?? hits.length };
}

export async function fetchGrantDetail(opportunityId: string): Promise<GrantDetail> {
  const res = await fetch(`${BASE}/fetchOpportunity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ opportunityId: Number(opportunityId) }),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Grants.gov fetchOpportunity failed: HTTP ${res.status}`);
  const json = await res.json();
  if (json.errorcode !== 0) throw new Error(`Grants.gov error: ${json.msg}`);

  const d = json.data;
  // Grants.gov returns errorcode 0 with an empty payload for unknown ids —
  // treat that as not-found instead of fabricating a grant.
  if (!d || d.id === undefined || d.id === null) {
    throw new Error(`Opportunity ${opportunityId} not found on Grants.gov.`);
  }
  const syn = d.synopsis ?? d.forecast ?? {};

  const eligibilityCodes: string[] = (syn.applicantTypes ?? [])
    .map((t: { id?: string }) => t.id ?? "")
    .filter(Boolean);

  return {
    id: String(d.id),
    number: d.opportunityNumber,
    title: cleanTitle(d.opportunityTitle ?? ""),
    agency: syn.agencyName ?? d.owningAgencyCode ?? "",
    agencyCode: d.owningAgencyCode ?? "",
    openDate: syn.postingDate ?? null,
    closeDate: syn.responseDate ?? null,
    status: d.opportunityCategory?.description ?? "posted",
    cfdaList: (d.cfdas ?? []).map((c: { cfdaNumber?: string }) => c.cfdaNumber ?? "").filter(Boolean),
    synopsis: stripHtml(syn.synopsisDesc ?? ""),
    awardFloor: parseMoney(syn.awardFloor),
    awardCeiling: parseMoney(syn.awardCeiling),
    expectedAwards: parseMoney(syn.numberOfAwards),
    totalFunding: parseMoney(syn.estimatedFunding),
    eligibilityDesc: stripHtml(syn.applicantEligibilityDesc ?? ""),
    eligibilityCodes,
    costSharing: Boolean(syn.costSharing),
    fundingCategories: (syn.fundingActivityCategories ?? [])
      .map((c: { id?: string }) => c.id ?? "")
      .filter(Boolean),
    fundingInstruments: (syn.fundingInstruments ?? [])
      .map((c: { description?: string }) => c.description ?? "")
      .filter(Boolean),
    contactEmail: syn.agencyContactEmail ?? null,
    contactName: syn.agencyContactName ?? null,
    externalUrl: syn.fundingDescLinkUrl ?? null,
  };
}

export function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Days until a Grants.gov date string ("Sep 24, 2026 12:00:00 AM EDT" or "09/24/2026"). */
export function daysUntil(dateStr: string | null, from: Date = new Date()): number | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr.replace(/\s+(EDT|EST|CDT|CST|MDT|MST|PDT|PST)$/, ""));
  if (isNaN(parsed.getTime())) return null;
  return Math.ceil((parsed.getTime() - from.getTime()) / 86_400_000);
}
