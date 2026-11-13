"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/components/i18n/language-provider";
import { workspaceErrorMessage, type WorkspaceLanguage } from "./workspace-messages";
import { getGithubAccountKey, useGithubSession } from "@/components/auth/github-session";
import {
  ApiError,
  analyzeGithubRepository,
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
  const [listing, setListing] = useState<RepositoryListing>(emptyListing);
  const listingSnapshot = useRef<RepositoryListing>(emptyListing());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdSnapshot = useRef<string | null>(null);
  const [goal, updateGoal] = useState("");
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
  const selectedRepository = listing.repositories.find((repository) => repository.id === selectedId) ?? null;

  const commitListing = useCallback((next: RepositoryListing) => {
    listingSnapshot.current = next;
    setListing(next);
  }, []);

  const commitSelectedId = useCallback((id: string | null) => {
    selectedIdSnapshot.current = id;
    setSelectedId(id);
  }, []);

  const cancelSelectionResolution = useCallback(() => {
    selectionRequest.current?.abort();
    selectionRequest.current = null;
    selectionTask.current = null;
    setSelectionState("idle");
    setSelectionError(null);
  }, []);

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
    if (!available) return;
    void loadRepositories(1);
    return () => {
      repositoryRequest.current?.abort();
      selectionRequest.current?.abort();
      analysisRequest.current?.abort();
    };
  }, [accountKey, available, loadRepositories]);

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
      if (selectionRequest.current) {
        selectionRequest.current.abort();
        selectionRequest.current = null;
        selectionTask.current = null;
        setSelectionError(null);
      }
      setSelectionState((current) => current === "loading" ? "idle" : current);
    };
  }, [pathname]);

  const refreshRepositories = useCallback(async () => {
    if (!available) return;
    cancelSelectionResolution();
    repositoryRequest.current?.abort();
    cancelAnalysis();
    commitSelectedId(null);
    updateGoal("");
    commitListing(emptyListing());
    await loadRepositories(1);
  }, [available, cancelAnalysis, cancelSelectionResolution, commitListing, commitSelectedId, loadRepositories]);

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
      updateGoal("");
      commitSelectedId(id);
    }
    setSelectionState("ready");
  }, [available, cancelAnalysis, cancelSelectionResolution, commitSelectedId]);

  const ensureRepositorySelected = useCallback((id: string): Promise<void> => {
    if (!available || pathname !== "/analyze" || window.location.pathname !== "/analyze") return Promise.resolve();
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
      setSelectionState("ready");
      return Promise.resolve();
    }
    cancelAnalysis();
    commitSelectedId(null);
    updateGoal("");
    if (listingSnapshot.current.repositoryError && !repositoryTask.current) {
      commitListing({ ...listingSnapshot.current, repositoryError: null });
    }
    setSelectionState("loading");
    const controller = new AbortController();
    selectionRequest.current = controller;
    const active = () => !controller.signal.aborted && selectionRequest.current === controller && window.location.pathname === "/analyze";
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
  }, [available, cancelAnalysis, cancelSelectionResolution, commitListing, commitSelectedId, loadRepositories, pathname]);

  const setGoal = useCallback((value: string) => {
    if (!available) return;
    cancelAnalysis();
    updateGoal(value.slice(0, 2000));
  }, [available, cancelAnalysis]);

  const analyzeRepository = useCallback(async () => {
    if (!available || pathname !== "/analyze" || window.location.pathname !== "/analyze" || !accountKey || !selectedRepository || analysisState === "done" || analysisRequest.current || selectionRequest.current) return;
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
      try {
        window.sessionStorage.setItem(GITHUB_ANALYSIS_STORAGE_KEY, JSON.stringify({
          accountKey,
          repositoryId: selectedRepository.id,
          analysis,
        }));
      } catch {
        setAnalysisState("error");
        setAnalysisError("analysis.storage");
        return;
      }
      setAnalysisState("done");
      router.push("/connect/github/analysis");
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
  }, [accountKey, analysisState, available, cancelAnalysis, cancelSelectionResolution, commitListing, commitSelectedId, goal, language, markUnauthenticated, pathname, router, selectedRepository]);

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
