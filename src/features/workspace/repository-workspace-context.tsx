"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getGithubAccountKey, useGithubSession } from "@/components/auth/github-session";
import { useRepositoryWorkspace, type RepositoryWorkspace } from "@/features/dashboard/use-repository-workspace";

const RepositoryWorkspaceContext = createContext<RepositoryWorkspace | null>(null);

function AccountRepositoryWorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useRepositoryWorkspace();
  return <RepositoryWorkspaceContext.Provider value={workspace}>{children}</RepositoryWorkspaceContext.Provider>;
}

export function RepositoryWorkspaceProvider({ children }: { children: ReactNode }) {
  const { status, user, loggingOut } = useGithubSession();
  const accountKey = getGithubAccountKey(user);
  if (status !== "authenticated" || !accountKey || loggingOut) return null;
  return <AccountRepositoryWorkspaceProvider key={accountKey}>{children}</AccountRepositoryWorkspaceProvider>;
}

export function useRepositoryWorkspaceContext(): RepositoryWorkspace {
  const workspace = useContext(RepositoryWorkspaceContext);
  if (!workspace) throw new Error("useRepositoryWorkspaceContext requires RepositoryWorkspaceProvider");
  return workspace;
}
