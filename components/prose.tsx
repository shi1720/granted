"use client";

import { Fragment, type ReactNode } from "react";

/**
 * Minimal markdown renderer for proposal prose ; paragraphs, bullet lists,
 * **bold**, and highlighted [ADD: …] placeholders. Content is rendered as
 * React text nodes, never injected as HTML.
 */
export function Prose({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim());
  return (
    <div className={`prose-proposal ${streaming ? "stream-caret" : ""}`}>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const isList = lines.length > 0 && lines.every((l) => /^\s*[-*•]\s+/.test(l));
        if (isList) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*[-*•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderInline(block.replace(/\n/g, " "))}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): ReactNode {
  // Tokenize [ADD: …] placeholders and **bold** spans.
  const parts = text.split(/(\[ADD:[^\]]*\]|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("[ADD:")) {
      return (
        <span key={i} className="placeholder-add" title="Granted never invents your data ; fill this in before submitting.">
          {part}
        </span>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
