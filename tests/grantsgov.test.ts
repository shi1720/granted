import { describe, expect, it } from "vitest";
import { cleanTitle, daysUntil, parseMoney, stripHtml } from "../lib/grantsgov";

describe("cleanTitle", () => {
  it("strips stray nbsp entities and collapses whitespace", () => {
    expect(cleanTitle("Youth Corps&nbsp;&nbsp;&nbsp;Bureau wide&nbsp;")).toBe(
      "Youth Corps Bureau wide",
    );
  });
  it("decodes common entities", () => {
    expect(cleanTitle("Health &amp; Justice")).toBe("Health & Justice");
  });
});

describe("parseMoney", () => {
  it("parses formatted amounts", () => {
    expect(parseMoney("1,000,000")).toBe(1_000_000);
    expect(parseMoney("$250,000")).toBe(250_000);
  });
  it("returns null for missing or non-numeric values", () => {
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney(undefined)).toBeNull();
    expect(parseMoney("none")).toBeNull();
    expect(parseMoney("")).toBeNull();
  });
  it("treats zero as unpublished", () => {
    expect(parseMoney("0")).toBeNull();
  });
});

describe("daysUntil", () => {
  const from = new Date("2026-09-15T12:00:00Z");
  it("parses Grants.gov datetime strings with timezone suffixes", () => {
    const days = daysUntil("Sep 24, 2026 12:00:00 AM EDT", from);
    expect(days).toBeGreaterThanOrEqual(8);
    expect(days).toBeLessThanOrEqual(9);
  });
  it("returns null for unparseable or missing dates", () => {
    expect(daysUntil(null, from)).toBeNull();
    expect(daysUntil("not a date", from)).toBeNull();
  });
});

describe("stripHtml", () => {
  it("converts breaks and strips tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p><br/>next")).toBe("Hello world\n\nnext");
  });
});
