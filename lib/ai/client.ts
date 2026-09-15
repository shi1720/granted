import Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic client factory + model configuration.
 *
 * Granted runs entirely on Claude. When no key is configured the app stays
 * fully usable: grant search is live (Grants.gov needs no key), fit analysis
 * falls back to the transparent heuristic engine, and drafting falls back to
 * the curated demo flow. Every fallback is labeled in the UI.
 */

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cached: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!cached) cached = new Anthropic();
  return cached;
}

/**
 * One model for the whole pipeline keeps prompt caches warm and quality
 * consistent. Override with ANTHROPIC_MODEL (e.g. claude-sonnet-5 to trade
 * a little quality for ~2.5× lower cost — unit economics in the README).
 */
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

/** Convert SDK errors into messages safe to show end users. */
export function friendlyAiError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "The configured ANTHROPIC_API_KEY was rejected. Check the key in .env.local.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Claude is rate-limited right now — wait a few seconds and try again.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Couldn't reach the Claude API. Check your network connection.";
  }
  if (err instanceof Anthropic.APIError) {
    return `Claude API error (${err.status ?? "unknown"}): ${err.message}`;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}
