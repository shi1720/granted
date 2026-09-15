import type { ProposalSection } from "../types";
/** Conservative numeric check. Flags unsupported figures for human review; it cannot verify the meaning of a claim. */
export function numericFacts(text: string): Set<string> {
  const values = new Set<string>();
  for (const match of text.matchAll(/\b\d[\d,]*(?:\.\d+)?\s*(?:million|billion|thousand|[mk](?![a-z]))?/gi)) {
    const raw = match[0].replace(/,/g, "").trim();
    const n = Number.parseFloat(raw);
    const multiplier = /billion/i.test(raw) ? 1e9 : /million|m$/i.test(raw) ? 1e6 : /thousand|k$/i.test(raw) ? 1e3 : 1;
    values.add(String(n * multiplier));
  }
  return values;
}
export function flagUnsupportedFigures(sections: ProposalSection[], evidence: string): {sections: ProposalSection[]; flagged: string[]} {
  const known = numericFacts(evidence);
  const flagged: string[] = [];
  return { sections: sections.map(section => ({...section, content: section.content.replace(/\u2014/g, ";").split(/\n\n/).map(sentence => {
    const factualText = sentence.replace(/\[ADD:[^\]]*\]/g, "");
    const missing = [...numericFacts(factualText)].filter(n => !known.has(n));
    if (!missing.length) return sentence;
    flagged.push(section.id);
    return `[ADD: verify and supply the evidence needed for this paragraph in ${section.title}. The generated paragraph contained figures absent from your supplied facts, so it has been withheld. Use confirmed outcomes or a checked source.]`;
  }).join("\n\n")})), flagged };
}
