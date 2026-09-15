"use client";

import Link from "next/link";
import type { FitReport } from "@/lib/types";
import { RECOMMENDATION_LABELS } from "@/lib/types";
import { daysLeft, deadlineTone, formatDate } from "@/lib/format";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-pine-700 text-paper">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12.5l5.5 5.5L20 7" />
        </svg>
      </span>
      <span className="font-display text-[1.35rem] font-semibold tracking-tight text-pine-950">
        granted<span className="text-pine-600">.</span>
      </span>
    </Link>
  );
}

export function RecommendationPill({
  recommendation,
  className = "",
}: {
  recommendation: FitReport["recommendation"];
  className?: string;
}) {
  const tone = {
    strong_apply: "bg-pine-700 text-paper",
    apply: "bg-pine-100 text-pine-900",
    borderline: "bg-amber-soft text-amber-strong",
    skip: "bg-danger-soft text-danger",
  }[recommendation];
  return (
    <span className={`pill ${tone} ${className}`}>{RECOMMENDATION_LABELS[recommendation]}</span>
  );
}

export function DeadlinePill({ closeDate }: { closeDate: string | null }) {
  const days = daysLeft(closeDate);
  const tone = deadlineTone(days);
  const styles = {
    gone: "bg-paper-deep text-ink-faint",
    urgent: "bg-danger-soft text-danger",
    soon: "bg-amber-soft text-amber-strong",
    ok: "bg-pine-50 text-pine-700",
  }[tone];
  return (
    <span className={`pill ${styles}`}>
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" />
      </svg>
      {days === null
        ? formatDate(closeDate)
        : days < 0
          ? "Closed"
          : days === 0
            ? "Closes today"
            : `${days} day${days === 1 ? "" : "s"} left`}
    </span>
  );
}

export function ScoreDial({
  score,
  size = 72,
  label,
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 75 ? "var(--color-pine-600)" : score >= 55 ? "var(--color-amber-strong)" : score >= 30 ? "var(--color-amber-strong)" : "var(--color-danger)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth="5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          className="score-ring"
          style={{ ["--ring-circ" as string]: `${circ}px` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <div className="font-display font-semibold" style={{ fontSize: size * 0.3, color }}>
            {score}
          </div>
          {label && <div className="mt-0.5 text-[9px] uppercase tracking-wider text-ink-faint">{label}</div>}
        </div>
      </div>
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function AiStatusBadge({
  loaded,
  aiEnabled,
  model,
}: {
  loaded: boolean;
  aiEnabled: boolean;
  model: string | null;
}) {
  if (!loaded) return null;
  return aiEnabled ? (
    <span className="pill bg-pine-50 text-pine-700 border border-pine-100" title={`Live Claude analysis: ${model}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-pine-600 pulse-dot" />
      Claude live
    </span>
  ) : (
    <span
      className="pill bg-amber-soft text-amber-strong"
      title="No ANTHROPIC_API_KEY configured — fit analysis uses the transparent heuristic engine and drafting replays the featured demo."
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-strong" />
      Demo mode
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card mx-auto max-w-md px-8 py-12 text-center">
      <h3 className="font-display text-xl font-semibold text-pine-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
