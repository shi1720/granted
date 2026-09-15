"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SavedWorkspaceZ } from "@/lib/storage";
import type { FitReport, OrgProfile, PipelineEntry, Proposal } from "@/lib/types";

/**
 * Client-side app state with localStorage persistence.
 * The MVP is deliberately serverless-friendly: your org profile, fit briefs,
 * pipeline, and proposals live in your browser; the server stays stateless.
 * (Roadmap: Postgres + auth for teams ; see README.)
 */

const STORAGE_KEY = "granted:v1";

interface PersistedState {
  org: OrgProfile | null;
  fitReports: Record<string, FitReport>;
  pipeline: PipelineEntry[];
  proposals: Record<string, Proposal>;
}

interface AiStatus {
  loaded: boolean;
  aiEnabled: boolean;
  model: string | null;
  apiBase: string;
}

interface GrantedStore extends PersistedState {
  hydrated: boolean;
  aiStatus: AiStatus;
  setOrg: (org: OrgProfile | null) => void;
  saveFitReport: (report: FitReport) => void;
  saveProposal: (proposal: Proposal) => void;
  addToPipeline: (entry: PipelineEntry) => void;
  updatePipeline: (grantId: string, patch: Partial<PipelineEntry>) => void;
  removeFromPipeline: (grantId: string) => void;
}

const EMPTY: PersistedState = { org: null, fitReports: {}, pipeline: [], proposals: {} };

const Ctx = createContext<GrantedStore | null>(null);

export function GrantedProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus>({
    loaded: false,
    aiEnabled: false,
    model: null,
    apiBase: "",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable post-mount; this is the standard hydration pattern.
      if (raw) { const restored = SavedWorkspaceZ.safeParse(JSON.parse(raw)); if (restored.success) setState(restored.data); }
    } catch {
      // Corrupt or unavailable storage ; start fresh.
    }
    setHydrated(true);

    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((s) => setAiStatus({ loaded: true, aiEnabled: Boolean(s.aiEnabled), model: s.model, apiBase: s.apiBase || "" }))
      .catch(() => setAiStatus({ loaded: true, aiEnabled: false, model: null, apiBase: "" }));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // Write synchronously: the payload is small, and a debounce here loses
    // state on hard navigations (a bug our smoke test caught).
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full/unavailable ; the app still works for this session.
    }
  }, [state, hydrated]);

  const setOrg = useCallback(
    (org: OrgProfile | null) =>
      setState((s) => JSON.stringify(org) === JSON.stringify(s.org) ? s : ({ ...EMPTY, org })),
    [],
  );
  const saveFitReport = useCallback(
    (report: FitReport) =>
      setState((s) => ({
        ...s,
        fitReports: { ...s.fitReports, [report.grantId]: report },
        pipeline: s.pipeline.map((p) =>
          p.grant.id === report.grantId
            ? { ...p, fitScore: report.fitScore, recommendation: report.recommendation }
            : p,
        ),
      })),
    [],
  );
  const saveProposal = useCallback(
    (proposal: Proposal) =>
      setState((s) => ({
        ...s,
        proposals: { ...s.proposals, [proposal.grantId]: proposal },
        pipeline: s.pipeline.map((p) =>
          p.grant.id === proposal.grantId && p.stage === "researching"
            ? { ...p, stage: "drafting" as const }
            : p,
        ),
      })),
    [],
  );
  const addToPipeline = useCallback(
    (entry: PipelineEntry) =>
      setState((s) =>
        s.pipeline.some((p) => p.grant.id === entry.grant.id)
          ? s
          : { ...s, pipeline: [...s.pipeline, entry] },
      ),
    [],
  );
  const updatePipeline = useCallback(
    (grantId: string, patch: Partial<PipelineEntry>) =>
      setState((s) => ({
        ...s,
        pipeline: s.pipeline.map((p) => (p.grant.id === grantId ? { ...p, ...patch } : p)),
      })),
    [],
  );
  const removeFromPipeline = useCallback(
    (grantId: string) =>
      setState((s) => ({ ...s, pipeline: s.pipeline.filter((p) => p.grant.id !== grantId) })),
    [],
  );

  const value = useMemo<GrantedStore>(
    () => ({
      ...state,
      hydrated,
      aiStatus,
      setOrg,
      saveFitReport,
      saveProposal,
      addToPipeline,
      updatePipeline,
      removeFromPipeline,
    }),
    [state, hydrated, aiStatus, setOrg, saveFitReport, saveProposal, addToPipeline, updatePipeline, removeFromPipeline],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGranted(): GrantedStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGranted must be used inside GrantedProvider");
  return ctx;
}
