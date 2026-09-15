import { describe, expect, it } from "vitest";
import { SectionStreamParser } from "../lib/ai/draft";

function collect() {
  const markers: string[] = [];
  const texts: Record<string, string> = {};
  const parser = new SectionStreamParser(
    (id) => {
      markers.push(id);
      texts[id] = texts[id] ?? "";
    },
    (id, text) => {
      texts[id] = (texts[id] ?? "") + text;
    },
  );
  return { parser, markers, texts };
}

describe("SectionStreamParser", () => {
  it("routes text to sections opened by marker lines", () => {
    const { parser, markers, texts } = collect();
    parser.push("@@intro@@\nHello world.\n@@body@@\nMore text.\n");
    parser.flush();
    expect(markers).toEqual(["intro", "body"]);
    expect(texts.intro.trim()).toBe("Hello world.");
    expect(texts.body.trim()).toBe("More text.");
  });

  it("handles markers split across arbitrary chunk boundaries", () => {
    const { parser, markers, texts } = collect();
    const full = "@@statement_of_need@@\nThe need is real.\n@@budget_narrative@@\nDollars.\n";
    // Push one character at a time — the harshest chunking possible.
    for (const ch of full) parser.push(ch);
    parser.flush();
    expect(markers).toEqual(["statement_of_need", "budget_narrative"]);
    expect(texts.statement_of_need.trim()).toBe("The need is real.");
    expect(texts.budget_narrative.trim()).toBe("Dollars.");
  });

  it("ignores preamble before the first marker", () => {
    const { parser, markers, texts } = collect();
    parser.push("Sure, here is the draft:\n@@intro@@\nContent.\n");
    parser.flush();
    expect(markers).toEqual(["intro"]);
    expect(texts.intro.trim()).toBe("Content.");
  });

  it("does not treat @@-prefixed prose as a marker", () => {
    const { parser, texts } = collect();
    parser.push("@@intro@@\nEmail us @@granted.org for info.\n");
    parser.flush();
    expect(texts.intro).toContain("@@granted.org");
  });

  it("streams partial non-marker lines eagerly", () => {
    const { parser, texts } = collect();
    parser.push("@@intro@@\n");
    parser.push("Partial sentence without newline");
    // Text should be routed even before a newline arrives.
    expect(texts.intro).toBe("Partial sentence without newline");
  });

  it("flushes trailing content without a final newline", () => {
    const { parser, texts } = collect();
    parser.push("@@intro@@\nLast line no newline");
    parser.flush();
    expect(texts.intro).toContain("Last line no newline");
  });
});
