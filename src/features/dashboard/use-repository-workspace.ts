"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  goal: string;
  setGoal: (value: string) => void;
  analysisState: AnalysisState;
  analysisError: string | null;
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

function repositoryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return "저장소 접근 권한이 없습니다. GitHub 연결 화면에서 권한을 확인해 주세요.";
    if (error.status === 429) return "GitHub 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
  }
  return "저장소를 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.";
}

function analysisErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const messages: Record<number, string> = {
      400: "분석 요청이 올바르지 않습니다. 개발 목표를 2,000자 이내로 입력해 주세요.",
      403: "선택한 저장소를 읽을 권한이 없습니다. GitHub 권한을 확인해 주세요.",
      404: "저장소를 찾을 수 없습니다. 목록을 새로고침해 주세요.",
      409: "이미 분석이 진행 중입니다. 잠시 후 다시 시도해 주세요.",
      422: "분석할 수 있는 문서나 코드가 없습니다. 다른 저장소를 선택해 주세요.",
      429: "요청이 많습니다. 잠시 후 다시 분석해 주세요.",
      502: "분석 결과를 받지 못했습니다. 잠시 후 다시 시도해 주세요.",
      503: "현재 분석 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      504: "분석 시간이 초과되었습니다. 목표를 좁혀 다시 시도해 주세요.",
    };
    return messages[error.status] ?? "저장소 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return "분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
  }
  return "분석을 완료하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.";
}

export function useRepositoryWorkspace(): RepositoryWorkspace {
  const router = useRouter();
  const { status, user, loggingOut, markUnauthenticated } = useGithubSession();
  const accountKey = getGithubAccountKey(user);
  const available = status === "authenticated" && !!accountKey && !loggingOut;
  const [listing, setListing] = useState<RepositoryListing>(emptyListing);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [goal, updateGoal] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const repositoryRequest = useRef<AbortController | null>(null);
  const analysisRequest = useRef<AbortController | null>(null);
  const selectedRepository = listing.repositories.find((repository) => repository.id === selectedId) ?? null;

  const cancelAnalysis = useCallback(() => {
    analysisRequest.current?.abort();
    analysisRequest.current = null;
    clearStoredAnalysis();
    setAnalysisState("idle");
    setAnalysisError(null);
  }, []);

  const loadRepositories = useCallback(async (nextPage: number) => {
    if (!available) return;
    repositoryRequest.current?.abort();
    const controller = new AbortController();
    repositoryRequest.current = controller;
    try {
      const data = await fetchGithubRepositories(nextPage, controller.signal);
      if (controller.signal.aborted || repositoryRequest.current !== controller) return;
      setListing((previous) => ({
        repositories: [...new Map(
          (nextPage === 1 ? data.items : [...previous.repositories, ...data.items])
            .map((repository) => [repository.id, repository]),
        ).values()],
        repositoryState: "ready",
        repositoryError: null,
        page: data.page,
        hasNextPage: data.hasNextPage,
        privateRepositoriesIncluded: data.privateRepositoriesIncluded,
        loadingMore: false,
      }));
    } catch (error) {
      if (controller.signal.aborted || repositoryRequest.current !== controller) return;
      if (error instanceof ApiError && error.status === 401) {
        analysisRequest.current?.abort();
        clearStoredAnalysis();
        setListing(emptyListing());
        setSelectedId(null);
        updateGoal("");
        markUnauthenticated();
        return;
      }
      setListing((previous) => ({
        ...previous,
        repositoryState: nextPage === 1 ? "error" : "ready",
        repositoryError: repositoryErrorMessage(error),
        loadingMore: false,
      }));
    } finally {
      if (repositoryRequest.current === controller) repositoryRequest.current = null;
    }
  }, [available, markUnauthenticated]);

  useEffect(() => {
    if (!available) return;
    clearStoredAnalysis();
    void loadRepositories(1);
    return () => {
      repositoryRequest.current?.abort();
      analysisRequest.current?.abort();
    };
  }, [accountKey, available, loadRepositories]);

  const refreshRepositories = useCallback(async () => {
    if (!available) return;
    repositoryRequest.current?.abort();
    cancelAnalysis();
    setSelectedId(null);
    updateGoal("");
    setListing(emptyListing());
    await loadRepositories(1);
  }, [available, cancelAnalysis, loadRepositories]);

  const loadMoreRepositories = useCallback(async () => {
    if (!available || repositoryRequest.current || !listing.hasNextPage || listing.page < 1) return;
    setListing((previous) => ({ ...previous, repositoryError: null, loadingMore: true }));
    await loadRepositories(listing.page + 1);
  }, [available, listing.hasNextPage, listing.page, loadRepositories]);

  const selectRepository = useCallback((id: string) => {
    if (!available || id === selectedId || !listing.repositories.some((repository) => repository.id === id)) return;
    cancelAnalysis();
    updateGoal("");
    setSelectedId(id);
  }, [available, cancelAnalysis, listing.repositories, selectedId]);

  const setGoal = useCallback((value: string) => {
    if (!available) return;
    cancelAnalysis();
    updateGoal(value.slice(0, 2000));
  }, [available, cancelAnalysis]);

  const analyzeRepository = useCallback(async () => {
    if (!available || !accountKey || !selectedRepository || analysisState === "done" || analysisRequest.current) return;
    clearStoredAnalysis();
    const controller = new AbortController();
    analysisRequest.current = controller;
    setAnalysisState("loading");
    setAnalysisError(null);
    try {
      const analysis = await analyzeGithubRepository(selectedRepository.id, goal, controller.signal);
      if (controller.signal.aborted || analysisRequest.current !== controller) return;
      try {
        window.sessionStorage.setItem(GITHUB_ANALYSIS_STORAGE_KEY, JSON.stringify({
          accountKey,
          repositoryId: selectedRepository.id,
          analysis,
        }));
      } catch {
        setAnalysisState("error");
        setAnalysisError("분석 결과를 보관하지 못했습니다. 브라우저의 저장소 사용을 허용한 뒤 다시 시도해 주세요.");
        return;
      }
      setAnalysisState("done");
      router.push("/connect/github/analysis");
    } catch (error) {
      if (controller.signal.aborted || analysisRequest.current !== controller) return;
      if (error instanceof ApiError && error.status === 401) {
        repositoryRequest.current?.abort();
        cancelAnalysis();
        setListing(emptyListing());
        setSelectedId(null);
        updateGoal("");
        markUnauthenticated();
        return;
      }
      setAnalysisState("error");
      setAnalysisError(analysisErrorMessage(error));
    } finally {
      if (analysisRequest.current === controller) analysisRequest.current = null;
    }
  }, [accountKey, analysisState, available, cancelAnalysis, goal, markUnauthenticated, router, selectedRepository]);

  return {
    ...(available ? listing : emptyListing()),
    refreshRepositories,
    loadMoreRepositories,
    selectedId: available ? selectedId : null,
    selectedRepository: available ? selectedRepository : null,
    selectRepository,
    goal: available ? goal : "",
    setGoal,
    analysisState: available ? analysisState : "idle",
    analysisError: available ? analysisError : null,
    analyzeRepository,
    cancelAnalysis,
  };
}
