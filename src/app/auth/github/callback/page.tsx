import { redirect } from "next/navigation";
import { API_BASE_URL, GITHUB_ENDPOINTS } from "@/lib/api/github-connect-api";

type GithubCallbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GithubCallbackPage({ searchParams }: GithubCallbackPageProps) {
  const incomingParams = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(incomingParams)) {
    if (typeof value === "string") query.append(key, value);
    else value?.forEach((item) => query.append(key, item));
  }

  const suffix = query.toString();
  const callbackUrl = `${API_BASE_URL}${GITHUB_ENDPOINTS.callback}${suffix ? `?${suffix}` : ""}`;
  redirect(callbackUrl);
}