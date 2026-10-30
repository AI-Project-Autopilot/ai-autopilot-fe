const configuredBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export const API_BASE_URL = configuredBase
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

export const GITHUB_ENDPOINTS = {
  login: "/api/auth/github",
  callback: "/api/auth/github/callback",
  me: "/api/auth/me",
  logout: "/api/auth/logout",
  repositories: "/api/github/repositories",
} as const;

export const GITHUB_ANALYSIS_STORAGE_KEY = "github-analysis-result";

export type GithubUser = {
  id?: string | number;
  login?: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export type GithubRepository = {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  isPrivate: boolean;
  htmlUrl: string;
  language: string | null;
  updatedAt: string;
  openIssueCount: number;
  archived: boolean;
};

export type GithubRepositoryPage = {
  items: GithubRepository[];
  page: number;
  perPage: number;
  hasNextPage: boolean;
  privateRepositoriesIncluded: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request(
  path: string,
  init?: RequestInit,
  timeoutMs = 15000,
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
  });
  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}`, response.status);
  }
  return response;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asId(value: unknown): string | number | undefined {
  return typeof value === "string" || typeof value === "number"
    ? value
    : undefined;
}

export function getGithubLoginUrl(): string {
  return `${API_BASE_URL}${GITHUB_ENDPOINTS.login}`;
}

export async function fetchCurrentUser(
  signal?: AbortSignal,
): Promise<GithubUser | null> {
  try {
    const response = await request(GITHUB_ENDPOINTS.me, { signal });
    const payload: unknown = await response.json();
    const root = asRecord(payload);
    const data = asRecord(root?.data) ?? root;
    const user = asRecord(data?.user) ?? data;
    if (!user) throw new Error("Invalid /auth/me response");
    const result: GithubUser = {
      id: asId(user.id),
      login: asString(user.login) ?? asString(user.username),
      name: asString(user.name) ?? null,
      email: asString(user.email) ?? null,
      avatarUrl: asString(user.avatarUrl) ?? asString(user.avatar_url) ?? null,
    };
    if (!result.id && !result.login)
      throw new Error("Unknown /auth/me response shape");
    return result;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function logoutGithub(signal?: AbortSignal): Promise<void> {
  await request(GITHUB_ENDPOINTS.logout, { method: "POST", signal });
}

function parseRepository(value: unknown): GithubRepository {
  const record = asRecord(value);
  if (
    !record ||
    typeof record.id !== "string" ||
    !record.id ||
    typeof record.owner !== "string" ||
    !record.owner ||
    typeof record.name !== "string" ||
    !record.name ||
    typeof record.fullName !== "string" ||
    !record.fullName ||
    (record.description !== null && typeof record.description !== "string") ||
    typeof record.defaultBranch !== "string" ||
    typeof record.isPrivate !== "boolean" ||
    typeof record.htmlUrl !== "string" ||
    (record.language !== null && typeof record.language !== "string") ||
    typeof record.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(record.updatedAt)) ||
    typeof record.openIssueCount !== "number" ||
    !Number.isSafeInteger(record.openIssueCount) ||
    record.openIssueCount < 0 ||
    typeof record.archived !== "boolean"
  ) {
    throw new Error("Invalid GitHub repository response");
  }

  const url = new URL(record.htmlUrl);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.username ||
    url.password
  ) {
    throw new Error("Invalid GitHub repository URL");
  }

  return {
    id: record.id,
    owner: record.owner,
    name: record.name,
    fullName: record.fullName,
    description: record.description,
    defaultBranch: record.defaultBranch,
    isPrivate: record.isPrivate,
    htmlUrl: url.toString(),
    language: record.language,
    updatedAt: record.updatedAt,
    openIssueCount: record.openIssueCount,
    archived: record.archived,
  };
}

export async function fetchGithubRepositories(
  page = 1,
  signal?: AbortSignal,
): Promise<GithubRepositoryPage> {
  if (!Number.isSafeInteger(page) || page < 1 || page > 999999) {
    throw new Error("Invalid GitHub repository page");
  }
  const response = await request(
    `${GITHUB_ENDPOINTS.repositories}?page=${page}`,
    { signal },
  );
  const payload: unknown = await response.json();
  const data = asRecord(payload);
  if (
    !data ||
    !Array.isArray(data.items) ||
    data.page !== page ||
    data.perPage !== 30 ||
    typeof data.hasNextPage !== "boolean" ||
    typeof data.privateRepositoriesIncluded !== "boolean"
  ) {
    throw new Error("Invalid GitHub repository page response");
  }
  return {
    items: data.items.map(parseRepository),
    page,
    perPage: data.perPage,
    hasNextPage: data.hasNextPage,
    privateRepositoriesIncluded: data.privateRepositoriesIncluded,
  };
}

export type GithubRepositoryAnalysis = {
  repository: {
    id: string;
    fullName: string;
    defaultBranch: string;
    htmlUrl: string;
    isPrivate: boolean;
    commitSha: string;
  };
  generatedAt: string;
  model: string;
  summary: string;
  recommendations: Array<{
    id: string;
    title: string;
    priority: "high" | "medium" | "low";
    rationale: string;
    implementationSteps: string[];
    acceptanceCriteria: string[];
    evidence: Array<{
      path: string;
      startLine: number;
      endLine: number;
      excerpt: string;
      url: string;
    }>;
  }>;
  context: {
    filesRead: Array<{
      path: string;
      bytes: number;
      truncated: boolean;
      lineCount: number;
    }>;
    totalFiles: number;
    skippedFiles: number;
    treeTruncated: boolean;
    warnings: string[];
  };
};

function analysisRecord(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  if (!record) throw new Error("Invalid repository analysis response");
  return record;
}

function analysisString(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error("Invalid repository analysis text");
  return value;
}

function analysisCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid repository analysis count");
  }
  return value;
}

function analysisBoolean(value: unknown): boolean {
  if (typeof value !== "boolean")
    throw new Error("Invalid repository analysis flag");
  return value;
}

function analysisArray(value: unknown): unknown[] {
  if (!Array.isArray(value))
    throw new Error("Invalid repository analysis list");
  return value;
}

function analysisStringList(value: unknown): string[] {
  return analysisArray(value).map(analysisString);
}

function githubUrl(value: unknown): string {
  const url = new URL(analysisString(value));
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.username ||
    url.password
  ) {
    throw new Error("Invalid analysis evidence URL");
  }
  return url.toString();
}

export function parseGithubRepositoryAnalysis(
  payload: unknown,
  repositoryId: string,
): GithubRepositoryAnalysis {
  const root = analysisRecord(payload);
  const repository = analysisRecord(root.repository);
  const context = analysisRecord(root.context);
  const id = analysisString(repository.id);
  const fullName = analysisString(repository.fullName);
  const commitSha = analysisString(repository.commitSha);
  if (id !== repositoryId || !/^[a-fA-F0-9]{40,64}$/.test(commitSha)) {
    throw new Error("Analysis does not match selected repository");
  }
  const generatedAt = analysisString(root.generatedAt);
  if (!Number.isFinite(Date.parse(generatedAt)))
    throw new Error("Invalid analysis date");
  return {
    repository: {
      id,
      fullName,
      defaultBranch: analysisString(repository.defaultBranch),
      htmlUrl: githubUrl(repository.htmlUrl),
      isPrivate: analysisBoolean(repository.isPrivate),
      commitSha,
    },
    generatedAt,
    model: analysisString(root.model),
    summary: analysisString(root.summary),
    recommendations: analysisArray(root.recommendations).map((item) => {
      const recommendation = analysisRecord(item);
      const priority = recommendation.priority;
      if (priority !== "high" && priority !== "medium" && priority !== "low") {
        throw new Error("Invalid analysis priority");
      }
      return {
        id: analysisString(recommendation.id),
        title: analysisString(recommendation.title),
        priority,
        rationale: analysisString(recommendation.rationale),
        implementationSteps: analysisStringList(
          recommendation.implementationSteps,
        ),
        acceptanceCriteria: analysisStringList(
          recommendation.acceptanceCriteria,
        ),
        evidence: analysisArray(recommendation.evidence).map((item) => {
          const evidence = analysisRecord(item);
          const startLine = analysisCount(evidence.startLine);
          const endLine = analysisCount(evidence.endLine);
          const url = githubUrl(evidence.url);
          if (
            startLine < 1 ||
            endLine < startLine ||
            !new URL(url).pathname.startsWith(`/${fullName}/blob/${commitSha}/`)
          ) {
            throw new Error("Invalid analysis evidence location");
          }
          return {
            path: analysisString(evidence.path),
            startLine,
            endLine,
            excerpt: analysisString(evidence.excerpt),
            url,
          };
        }),
      };
    }),
    context: {
      filesRead: analysisArray(context.filesRead).map((item) => {
        const file = analysisRecord(item);
        return {
          path: analysisString(file.path),
          bytes: analysisCount(file.bytes),
          truncated: analysisBoolean(file.truncated),
          lineCount: analysisCount(file.lineCount),
        };
      }),
      totalFiles: analysisCount(context.totalFiles),
      skippedFiles: analysisCount(context.skippedFiles),
      treeTruncated: analysisBoolean(context.treeTruncated),
      warnings: analysisStringList(context.warnings),
    },
  };
}

export async function analyzeGithubRepository(
  repositoryId: string,
  goal = "",
  signal?: AbortSignal,
): Promise<GithubRepositoryAnalysis> {
  if (!/^[1-9][0-9]{0,19}$/.test(repositoryId) || goal.length > 2000) {
    throw new ApiError("Invalid repository analysis request", 400);
  }
  const trimmedGoal = goal.trim();
  const response = await request(
    `${GITHUB_ENDPOINTS.repositories}/${encodeURIComponent(repositoryId)}/analysis`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trimmedGoal ? { goal: trimmedGoal } : {}),
      signal,
    },
    120000,
  );
  return parseGithubRepositoryAnalysis(await response.json(), repositoryId);
}
