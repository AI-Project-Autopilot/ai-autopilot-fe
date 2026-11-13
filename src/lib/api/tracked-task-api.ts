import { API_BASE_URL, ApiError } from "./github-connect-api";
import { isLanguage, type Language } from "@/lib/i18n/language";

export type TrackedTaskStatus = "selected" | "in_progress" | "completed" | "cancelled";
export type TrackedTask = {
  id: string;
  analysisId: string;
  recommendationId: string;
  repositoryId: string;
  fullName: string;
  language: Language;
  title: string;
  body: string;
  priority: "high" | "medium" | "low";
  status: TrackedTaskStatus;
  issueNumber: number | null;
  issueUrl: string | null;
  issueState: "open" | "closed" | null;
  issueStateReason: string | null;
  issueCreationState: "none" | "creating" | "created" | "uncertain";
  issueCreationStartedAt: string | null;
  issueSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type TrackedTaskPage = { items: TrackedTask[]; page: number; perPage: number; hasNextPage: boolean };
export type TrackedTaskPatch = { title?: string; body?: string; status?: TrackedTaskStatus };

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid tracked task response");
  return value as Record<string, unknown>;
}
function taskId(value: unknown): value is string {
  return typeof value === "string" && /^c[a-z0-9]{24}$/.test(value);
}
function date(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function taskStatus(value: unknown): value is TrackedTaskStatus { return value === "selected" || value === "in_progress" || value === "completed" || value === "cancelled"; }

export function parseTrackedTask(value: unknown): TrackedTask {
  const row = record(value);
  if (!taskId(row.id) || !taskId(row.analysisId) ||
    typeof row.recommendationId !== "string" || !row.recommendationId ||
    typeof row.repositoryId !== "string" || !/^[1-9][0-9]{0,19}$/.test(row.repositoryId) ||
    typeof row.fullName !== "string" || !/^[^/\s]+\/[^/\s]+$/.test(row.fullName) ||
    !isLanguage(row.language) || typeof row.title !== "string" || !row.title.trim() || row.title.length > 200 ||
    typeof row.body !== "string" || row.body.length > 30000 || !taskStatus(row.status) ||
    (row.priority !== "high" && row.priority !== "medium" && row.priority !== "low") ||
    (row.issueNumber !== null && (typeof row.issueNumber !== "number" || !Number.isSafeInteger(row.issueNumber) || row.issueNumber < 1 || row.issueNumber > 2147483647)) ||
    (row.issueUrl !== null && typeof row.issueUrl !== "string") ||
    (row.issueState !== null && row.issueState !== "open" && row.issueState !== "closed") ||
    (row.issueStateReason !== null && typeof row.issueStateReason !== "string") ||
    (row.issueCreationState !== "none" && row.issueCreationState !== "creating" && row.issueCreationState !== "created" && row.issueCreationState !== "uncertain") ||
    (row.issueCreationStartedAt !== null && !date(row.issueCreationStartedAt)) ||
    (row.issueSyncedAt !== null && !date(row.issueSyncedAt)) || !date(row.createdAt) || !date(row.updatedAt)
  ) throw new Error("Invalid tracked task response");
  if (row.issueNumber === null
    ? row.issueUrl !== null || row.issueState !== null || row.issueCreationState === "created"
    : row.issueUrl === null || row.issueState === null || row.issueCreationState !== "created") {
    throw new Error("Inconsistent tracked issue state");
  }
  if (row.issueUrl !== null) {
    const url = new URL(row.issueUrl);
    if (url.origin !== "https://github.com" || url.username || url.password || url.search || url.hash ||
      url.pathname !== `/${row.fullName}/issues/${row.issueNumber}`) throw new Error("Invalid task issue URL");
  }
  return {
    id: row.id, analysisId: row.analysisId, recommendationId: row.recommendationId,
    repositoryId: row.repositoryId, fullName: row.fullName, language: row.language,
    title: row.title, body: row.body, priority: row.priority, status: row.status,
    issueNumber: row.issueNumber, issueUrl: row.issueUrl, issueState: row.issueState,
    issueStateReason: row.issueStateReason, issueCreationState: row.issueCreationState,
    issueCreationStartedAt: row.issueCreationStartedAt, issueSyncedAt: row.issueSyncedAt,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const timeout = AbortSignal.timeout(45000);
  const response = await fetch(`${API_BASE_URL}/api/github${path}`, {
    ...init, credentials: "include", cache: "no-store",
    signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
  });
  if (!response.ok) throw new ApiError(`HTTP ${response.status}`, response.status);
  return response.json();
}
function json(method: string, body: unknown, signal?: AbortSignal): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal };
}
function requireTaskId(id: string) { if (!taskId(id)) throw new ApiError("Invalid task ID", 400); }

export async function selectAnalysisTask(analysisId: string, recommendationId: string, signal?: AbortSignal): Promise<TrackedTask> {
  requireTaskId(analysisId);
  if (!recommendationId || recommendationId.length > 100) throw new ApiError("Invalid recommendation", 400);
  const result = parseTrackedTask(await request(`/analyses/${analysisId}/tasks`, json("POST", { recommendationId }, signal)));
  if (result.analysisId !== analysisId || result.recommendationId !== recommendationId) throw new Error("Task does not match selected recommendation");
  return result;
}
export async function listTrackedTasks(filters: { repositoryId?: string; analysisId?: string; page?: number } = {}, signal?: AbortSignal): Promise<TrackedTaskPage> {
  const { repositoryId, analysisId, page = 1 } = filters;
  if (!Number.isSafeInteger(page) || page < 1 || page > 999999 ||
    (repositoryId !== undefined && !/^[1-9][0-9]{0,19}$/.test(repositoryId)) ||
    (analysisId !== undefined && !taskId(analysisId))) throw new ApiError("Invalid task list request", 400);
  const query = new URLSearchParams({ page: String(page) });
  if (repositoryId) query.set("repositoryId", repositoryId);
  if (analysisId) query.set("analysisId", analysisId);
  const data = record(await request(`/tasks?${query}`, { signal }));
  if (!Array.isArray(data.items) || data.page !== page || data.perPage !== 20 || typeof data.hasNextPage !== "boolean") throw new Error("Invalid tracked task page");
  const items = data.items.map(parseTrackedTask);
  if (items.some(item => (repositoryId !== undefined && item.repositoryId !== repositoryId) || (analysisId !== undefined && item.analysisId !== analysisId))) throw new Error("Task filter does not match result");
  return { items, page, perPage: data.perPage, hasNextPage: data.hasNextPage };
}
export async function fetchTrackedTask(id: string, signal?: AbortSignal): Promise<TrackedTask> {
  requireTaskId(id);
  const result = parseTrackedTask(await request(`/tasks/${id}`, { signal }));
  if (result.id !== id) throw new Error("Task does not match requested ID");
  return result;
}
async function mutateTask(id: string, suffix: string, init: RequestInit): Promise<TrackedTask> {
  requireTaskId(id);
  const result = parseTrackedTask(await request(`/tasks/${id}${suffix}`, init));
  if (result.id !== id) throw new Error("Task does not match requested ID");
  return result;
}
export async function updateTrackedTask(id: string, patch: TrackedTaskPatch, signal?: AbortSignal): Promise<TrackedTask> {
  if ((patch.title !== undefined && (!patch.title.trim() || patch.title.length > 200)) ||
    (patch.body !== undefined && patch.body.length > 30000) || (patch.status !== undefined && !taskStatus(patch.status))) throw new ApiError("Invalid task update", 400);
  return mutateTask(id, "", json("PATCH", patch, signal));
}
export function createTrackedTaskIssue(id: string, signal?: AbortSignal) { return mutateTask(id, "/issue", json("POST", {}, signal)); }
export function syncTrackedTaskIssue(id: string, signal?: AbortSignal) { return mutateTask(id, "/issue/sync", json("POST", {}, signal)); }
export function linkTrackedTaskIssue(id: string, issueNumber: number, signal?: AbortSignal) {
  if (!Number.isSafeInteger(issueNumber) || issueNumber < 1 || issueNumber > 2147483647) throw new ApiError("Invalid issue number", 400);
  return mutateTask(id, "/issue/link", json("POST", { issueNumber }, signal));
}
