import type { OrgProfile } from "../types";
import { structured } from "./client";
import { PROFILE_EXTRACTOR_SYSTEM } from "./prompts";
import { ExtractedProfileSchema } from "./schemas";

/**
 * Build a structured org profile from freeform text ; mission statement,
 * website copy, an annual report excerpt. Extraction only; never invention.
 */
export async function extractProfile(freeform: string): Promise<OrgProfile> {
  const response = await structured(ExtractedProfileSchema, PROFILE_EXTRACTOR_SYSTEM, `Extract the organization profile from this text:\n\n${freeform}`);

  const p = response.parsed_output;
  if (!p) throw new Error("Couldn't extract a profile from that text. Try adding more detail.");

  return {
    ...p,
    yearFounded: p.yearFounded ?? undefined,
  };
}
