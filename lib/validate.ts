import { z } from "zod";

/** Runtime validation for OrgProfile payloads arriving from the client. */
export const OrgProfileZ = z.object({
  name: z.string().min(1).max(200),
  tagline: z.string().max(300),
  mission: z.string().min(1).max(3000),
  focusAreas: z.array(z.string().max(120)).max(10),
  fundingCategories: z.array(z.string().max(5)).max(10),
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
  annualBudgetUsd: z.number().min(0).max(10_000_000_000),
  staffCount: z.number().min(0).max(1_000_000),
  city: z.string().max(120),
  state: z.string().max(40),
  yearFounded: z.number().min(1600).max(2100).optional(),
  programs: z.array(z.string().max(1000)).max(10),
  achievements: z.array(z.string().max(1000)).max(10),
  populationsServed: z.array(z.string().max(200)).max(10),
  grantHistory: z.string().max(2000),
});
