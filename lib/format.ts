/** Client-safe formatting helpers. */

export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

export function formatMoneyFull(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString()}`;
}

/** Parse Grants.gov date strings ("Sep 24, 2026 12:00:00 AM EDT" or "09/24/2026"). */
export function parseGrantDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr.replace(/\s+(EDT|EST|CDT|CST|MDT|MST|PDT|PST)$/, ""));
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(dateStr: string | null): string {
  const d = parseGrantDate(dateStr);
  if (!d) return "Not published";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function daysLeft(dateStr: string | null): number | null {
  const d = parseGrantDate(dateStr);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export function deadlineTone(days: number | null): "gone" | "urgent" | "soon" | "ok" {
  if (days === null) return "ok";
  if (days < 0) return "gone";
  if (days <= 14) return "urgent";
  if (days <= 45) return "soon";
  return "ok";
}
