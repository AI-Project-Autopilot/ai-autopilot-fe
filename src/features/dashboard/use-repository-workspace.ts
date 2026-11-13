"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/components/i18n/language-provider";
import { workspaceErrorMessage, type WorkspaceLanguage } from "./workspace-messages";
import { getGithubAccountKey, useGithubSession } from "@/components/auth/github-session";
import {
  ApiError,
  analyzeGithubRepository,
  fetchGithubAnalyses,
  fetchGithubRepositories,
  GITHUB_ANALYSIS_STORAGE_KEY,
  type GithubRepository,
} from "@/lib/api/github-connect-api";

type RepositoryState = "loading" | "ready" | "error";
type AnalysisState = "idle" | "loading" | "done" | "error";
type SelectionState = "idle" | "loading" | "ready" | "error";

type RepositoryListing = {
  repositories: GithubRepository[];
  repositoryState: RepositoryState;
  repositoryError: string | null;
  page: number;
  hasNextPage: boolean;
  privateRepositoriesIncluded: boolean | null;
  loadingMore: boolean;
};

export type RepositoryWorkspace = RepositoryListing & {
  refreshRepositories: () => Promise<void>;
  loadMoreRepositories: () => Promise<void>;
  selectedId: string | null;
  selectedRepository: GithubRepository | null;
  selectRepository: (id: string) => void;
  ensureRepositorySelected: (id: string) => Promise<void>;
  selectionState: SelectionState;
  selectionError: string | null;
  goal: string;
  setGoal: (value: string) => void;
  analysisState: AnalysisState;
  analysisError: string | null;
  requestedAnalysisLanguage: WorkspaceLanguage | null;
  repositoryPermissionError: boolean;
  analyzeRepository: () => Promise<void>;
  cancelAnalysis: () => void;
};

function emptyListing(): RepositoryListing {
  return {
    repositories: [],
    repositoryState: "loading",
    repositoryError: null,
    page: 0,
    hasNextPage: false,
    privateRepositoriesIncluded: null,
    loadingMore: false,
  };
}

function clearStoredAnalysis() {
  try {
    window.sessionStorage.removeItem(GITHUB_ANALYSIS_STORAGE_KEY);
  } catch {
    // Canceling a request must work even when browser storage is unavailable.
  }
}

type StoredWorkspace = { selectedId: string | null; drafts: Record<string, string> };

function readStoredWorkspace(accountKey: string | null): StoredWorkspace {
  const empty: StoredWorkspace = { selectedId: null, drafts: {} };
  if (!accountKey || typeof window === "undefined") return empty;
  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(`github-workspace:${accountKey}`) ?? "null");
    if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return empty;
    const value = stored as Record<string, unknown>;
    const selectedId = typeof value.selectedId === "string" && /^[1-9][0-9]{0,19}$/.test(value.selectedId) ? value.selectedId : null;
    const drafts: Record<string, string> = {};
    if (typeof value.drafts === "object" && value.drafts !== null && !Array.isArray(value.drafts)) {
      for (const [id, draft] of Object.entries(value.drafts)) {
        if (/^[1-9][0-9]{0,19}$/.test(id) && typeof draft === "string" && draft.length <= 2000) drafts[id] = draft;
      }
    }
    return { selectedId, drafts };
  } catch {
    return empty;
  }
}

function repositoryErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return "repository.forbidden";
    if (error.status === 429) return "repository.rateLimit";
  }
  return "repository.failed";
}

function analysisErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    const messages: Record<number, string> = {
      400: "analysis.invalid", 403: "analysis.forbidden", 404: "analysis.notFound",
      409: "analysis.conflict", 422: "analysis.empty", 429: "analysis.rateLimit",
      502: "analysis.resultFailed", 503: "analysis.unavailable", 504: "analysis.timeout",
    };
    return messages[error.status] ?? "analysis.apiFailed";
  }
  return error instanceof Error && error.name === "TimeoutError" ? "analysis.timeout" : "analysis.connectionFailed";
}

export function useRepositoryWorkspace(): RepositoryWorkspace {
  const router = useRouter();
  const { language } = useLanguage();
  const pathname = usePathname();
  const { status, user, loggingOut, markUnauthenticated } = useGithubSession();
  const accountKey = getGithubAccountKey(user);
  const available = status === "authenticated" && !!accountKey && !loggingOut;
  // The account-keyed provider mounts after authentication, so browser storage
  // can initialize state without resetting it in an effect on every navigation.
  const [initialWorkspace] = useState(() => readStoredWorkspace(accountKey));
  const storedWorkspace = useRef(initialWorkspace);
  const savedGoals = useRef<Record<string, string>>({});
  const [listing, setListing] = useState<RepositoryListing>(emptyListing);
  const listingSnapshot = useRef<RepositoryListing>(emptyListing());
  const [selectedId, setSelectedId] = useState<string | null>(initialWorkspace.selectedId);
  const selectedIdSnapshot = useRef<string | null>(initialWorkspace.selectedId);
  const [goal, updateGoal] = useState(initialWorkspace.selectedId ? initialWorkspace.drafts[initialWorkspace.selectedId] ?? "" : "");
  const [selectionState, setSelectionState] = useState<SelectionState>("idle");
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [requestedAnalysisLanguage, setRequestedAnalysisLanguage] = useState<WorkspaceLanguage | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const repositoryRequest = useRef<AbortController | null>(null);
  const repositoryTask = useRef<Promise<RepositoryListing | null> | null>(null);
  const selectionRequest = useRef<AbortController | null>(null);
  const selectionTask = useRef<{ id: string; task: Promise<void> } | null>(null);
  const analysisRequest = useRef<AbortController | null>(null);
  const goalRequest = useRef<AbortController | null>(null);
  const selectedRepository = listing.repositories.find((repository) => repository.id === selectedId) ?? null;

  const commitListing = useCallback((next: RepositoryListing) => {
    listingSnapshot.current = next;
    setListing(next);
  }, []);

  const persistWorkspace = useCallback(() => {
    if (!accountKey) return;
    try {
      window.sessionStorage.setItem(`github-workspace:${accountKey}`, JSON.stringify(storedWorkspace.current));
    } catch {
      // Browser draft storage is optional; completed analyses live in the DB.
    }
  }, [accountKey]);

  const commitSelectedId = useCallback((id: string | null) => {
    selectedIdSnapshot.current = id;
    setSelectedId(id);
    storedWorkspace.current = { ...storedWorkspace.current, selectedId: id };
    persistWorkspace();
  }, [persistWorkspace]);

  const cancelSelectionResolution = useCallback(() => {
    selectionRequest.current?.abort();
    selectionRequest.current = null;
    selectionTask.current = null;
    goalRequest.current?.abort();
    goalRequest.current = null;
    setSelectionState("idle");
    setSelectionError(null);
  }, []);

  const restoreGoal = useCallback((id: string) => {
    goalRequest.current?.abort();
    goalRequest.current = null;
    const draft = storedWorkspace.current.drafts[id];
    updateGoal(draft ?? savedGoals.current[id] ?? "");
    if (draft !== undefined) return;
    const controller = new AbortController();
    goalRequest.current = controller;
    void fetchGithubAnalyses(id, 1, controller.signal).then((data) => {
      if (controller.signal.aborted || goalRequest.current !== controller) return;
      const savedGoal = data.items[0]?.goal ?? "";
      savedGoals.current[id] = savedGoal;
      if (selectedIdSnapshot.current === id && storedWorkspace.current.drafts[id] === undefined) updateGoal(savedGoal);
    }).catch((error) => {
      if (controller.signal.aborted || goalRequest.current !== controller) return;
      if (error instanceof ApiError && error.status === 401) markUnauthenticated();
      // A history request failure must not discard a local draft or block analysis.
    }).finally(() => {
      if (goalRequest.current === controller) goalRequest.current = null;
    });
  }, [markUnauthenticated]);

  const cancelAnalysis = useCallback(() => {
    analysisRequest.current?.abort();
    analysisRequest.current = null;
    clearStoredAnalysis();
    setAnalysisState("idle");
    setAnalysisError(null);
    setRequestedAnalysisLanguage(null);
  }, []);

  const loadRepositories = useCallback((nextPage: number, selectionSignal?: AbortSignal): Promise<RepositoryListing | null> => {
    if (!available) return Promise.resolve(null);
    repositoryRequest.current?.abort();
    const controller = new AbortController();
    repositoryRequest.current = controller;
    const signal = selectionSignal ? AbortSignal.any([controller.signal, selectionSignal]) : controller.signal;
    const task = (async () => {
      try {
        const data = await fetchGithubRepositories(nextPage, signal);
        if (signal.aborted || repositoryRequest.current !== controller) return null;
        const next: RepositoryListing = {
          repositories: [...new Map(
            (nextPage === 1 ? data.items : [...listingSnapshot.current.repositories, ...data.items])
              .map((repository) => [repository.id, repository]),
          ).values()],
          repositoryState: "ready",
          repositoryError: null,
          page: data.page,
          hasNextPage: data.hasNextPage,
          privateRepositoriesIncluded: data.privateRepositoriesIncluded,
          loadingMore: false,
        };
        commitListing(next);
        return next;
      } catch (error) {
        if (signal.aborted || repositoryRequest.current !== controller) return null;
        if (error instanceof ApiError && error.status === 401) {
          analysisRequest.current?.abort();
          selectionRequest.current?.abort();
          clearStoredAnalysis();
          commitListing(emptyListing());
          commitSelectedId(null);
          updateGoal("");
          markUnauthenticated();
          return null;
        }
        commitListing({
          ...listingSnapshot.current,
          repositoryState: nextPage === 1 ? "error" : "ready",
          repositoryError: repositoryErrorKey(error),
          loadingMore: false,
        });
        return null;
      } finally {
        if (repositoryRequest.current === controller) {
          repositoryRequest.current = null;
          repositoryTask.current = null;
          if (signal.aborted && listingSnapshot.current.loadingMore) {
            commitListing({ ...listingSnapshot.current, loadingMore: false });
          }
        }
      }
    })();
    repositoryTask.current = task;
    return task;
  }, [available, commitListing, commitSelectedId, markUnauthenticated]);

  useEffect(() => {
    return () => {
      // Changing screens cancels pending work while keeping the selected repo,
      // goal, loaded pages, and an already completed result available.
      if (analysisRequest.current) {
        analysisRequest.current.abort();
        analysisRequest.current = null;
        setAnalysisError(null);
      }
      setAnalysisState((current) => current === "loading" ? "idle" : current);
    };
  }, [pathname]);

  const loadMoreRepositories = useCallback(async () => {
    const current = listingSnapshot.current;
    if (!available || repositoryRequest.current || !current.hasNextPage || current.page < 1) return;
    commitListing({ ...current, repositoryError: null, loadingMore: true });
    await loadRepositories(current.page + 1);
  }, [available, commitListing, loadRepositories]);

  const selectRepository = useCallback((id: string) => {
    if (!available || !listingSnapshot.current.repositories.some((repository) => repository.id === id)) return;
    cancelSelectionResolution();
    if (id !== selectedIdSnapshot.current) {
      cancelAnalysis();
      commitSelectedId(id);
    }
    restoreGoal(id);
    setSelectionState("ready");
  }, [available, cancelAnalysis, cancelSelectionResolution, commitSelectedId, restoreGoal]);

  const ensureRepositorySelected = useCallback((id: string): Promise<void> => {
    if (!available) return Promise.resolve();
    if (selectionTask.current?.id === id) return selectionTask.current.task;
    cancelSelectionResolution();
    if (!/^[1-9][0-9]{0,19}$/.test(id)) {
      cancelAnalysis();
      commitSelectedId(null);
      updateGoal("");
      setSelectionState("error");
      setSelectionError("selection.invalid");
      return Promise.resolve();
    }
    if (selectedIdSnapshot.current === id && listingSnapshot.current.repositories.some((repository) => repository.id === id)) {
      restoreGoal(id);
      setSelectionState("ready");
      return Promise.resolve();
    }
    cancelAnalysis();
    // Keep the persisted preference while checking pages beyond the first one.
    // Only the temporary selection is hidden until access is verified.
    selectedIdSnapshot.current = null;
    setSelectedId(null);
    if (listingSnapshot.current.repositoryError && !repositoryTask.current) {
      commitListing({ ...listingSnapshot.current, repositoryError: null });
    }
    setSelectionState("loading");
    const controller = new AbortController();
    selectionRequest.current = controller;
    const active = () => !controller.signal.aborted && selectionRequest.current === controller;
    const task = (async () => {
      // The child route may request its query selection before the provider's
      // initial effect starts. Let that effect create the shared first-page task.
      await Promise.resolve();
      const pending = repositoryTask.current;
      if (pending) await pending;
      while (active()) {
        const current = listingSnapshot.current;
        if (current.repositories.some((repository) => repository.id === id)) {
          commitSelectedId(id);
          restoreGoal(id);
          setSelectionState("ready");
          return;
        }
        if (current.repositoryError) {
          setSelectionState("error");
          setSelectionError(current.repositoryError);
          return;
        }
        if (current.page > 0 && !current.hasNextPage) {
          setSelectionState("error");
          setSelectionError("selection.notFound");
          return;
        }
        commitListing({ ...current, loadingMore: current.page > 0 });
        const next = await loadRepositories(current.page + 1, controller.signal);
        if (!active()) return;
        if (!next) {
          setSelectionState("error");
          setSelectionError(listingSnapshot.current.repositoryError ?? "selection.failed");
          return;
        }
      }
    })().finally(() => {
      if (selectionRequest.current === controller) {
        selectionRequest.current = null;
        selectionTask.current = null;
      }
    });
    selectionTask.current = { id, task };
    return task;
  }, [available, cancelAnalysis, cancelSelectionResolution, commitListing, commitSelectedId, loadRepositories, restoreGoal]);

  const refreshRepositories = useCallback(async () => {
    if (!available) return;
    const id = selectedIdSnapshot.current ?? storedWorkspace.current.selectedId;
    cancelSelectionResolution();
    repositoryRequest.current?.abort();
    cancelAnalysis();
    commitListing(emptyListing());
    await loadRepositories(1);
    if (id) await ensureRepositorySelected(id);
  }, [available, cancelAnalysis, cancelSelectionResolution, commitListing, ensureRepositorySelected, loadRepositories]);

  useEffect(() => {
    if (!available) return;
    let active = true;
    void loadRepositories(1).then(() => {
      if (!active || selectionTask.current) return;
      const id = selectedIdSnapshot.current ?? storedWorkspace.current.selectedId;
      if (id) void ensureRepositorySelected(id);
    });
    return () => {
      active = false;
      repositoryRequest.current?.abort();
      selectionRequest.current?.abort();
      selectionRequest.current = null;
      selectionTask.current = null;
      analysisRequest.current?.abort();
      goalRequest.current?.abort();
      goalRequest.current = null;
    };
  }, [accountKey, available, ensureRepositorySelected, loadRepositories]);

  const setGoal = useCallback((value: string) => {
    if (!available) return;
    cancelAnalysis();
    goalRequest.current?.abort();
    goalRequest.current = null;
    const draft = value.slice(0, 2000);
    updateGoal(draft);
    const id = selectedIdSnapshot.current;
    if (id) {
      storedWorkspace.current = { ...storedWorkspace.current, drafts: { ...storedWorkspace.current.drafts, [id]: draft } };
      persistWorkspace();
    }
  }, [available, cancelAnalysis, persistWorkspace]);

  const analyzeRepository = useCallback(async () => {
    if (!available || pathname !== "/analyze" || window.location.pathname !== "/analyze" || !accountKey || !selectedRepository || analysisState === "done" || analysisRequest.current || selectionRequest.current) return;
    goalRequest.current?.abort();
    goalRequest.current = null;
    clearStoredAnalysis();
    const controller = new AbortController();
    analysisRequest.current = controller;
    const requestLanguage = language;
    setRequestedAnalysisLanguage(requestLanguage);
    setAnalysisState("loading");
    setAnalysisError(null);
    try {
      const analysis = await analyzeGithubRepository(selectedRepository.id, goal, controller.signal, requestLanguage);
      if (controller.signal.aborted || analysisRequest.current !== controller || window.location.pathname !== "/analyze") return;
      if (!analysis.analysisId) {
        setAnalysisState("error");
        setAnalysisError("analysis.resultFailed");
        return;
      }
      savedGoals.current[selectedRepository.id] = goal.trim();
      delete storedWorkspace.current.drafts[selectedRepository.id];
      persistWorkspace();
      setAnalysisState("done");
      router.push(`/connect/github/analysis?analysisId=${encodeURIComponent(analysis.analysisId)}`);
    } catch (error) {
      if (controller.signal.aborted || analysisRequest.current !== controller || window.location.pathname !== "/analyze") return;
      if (error instanceof ApiError && error.status === 401) {
        repositoryRequest.current?.abort();
        cancelSelectionResolution();
        cancelAnalysis();
        commitListing(emptyListing());
        commitSelectedId(null);
        updateGoal("");
        markUnauthenticated();
        return;
      }
      setAnalysisState("error");
      setAnalysisError(analysisErrorKey(error));
    } finally {
      if (analysisRequest.current === controller) analysisRequest.current = null;
    }
  }, [accountKey, analysisState, available, cancelAnalysis, cancelSelectionResolution, commitListing, commitSelectedId, goal, language, markUnauthenticated, pathname, persistWorkspace, router, selectedRepository]);

  return {
    ...(available ? listing : emptyListing()),
    repositoryError: available ? workspaceErrorMessage(listing.repositoryError, language) : null,
    repositoryPermissionError: available && listing.repositoryError === "repository.forbidden",
    refreshRepositories,
    loadMoreRepositories,
    selectedId: available ? selectedId : null,
    selectedRepository: available ? selectedRepository : null,
    selectRepository,
    ensureRepositorySelected,
    selectionState: available ? selectionState : "idle",
    selectionError: available ? workspaceErrorMessage(selectionError, language) : null,
    goal: available ? goal : "",
    setGoal,
    analysisState: available ? analysisState : "idle",
    analysisError: available ? workspaceErrorMessage(analysisError, language) : null,
    requestedAnalysisLanguage: available ? requestedAnalysisLanguage : null,
    analyzeRepository,
    cancelAnalysis,
  };
}
