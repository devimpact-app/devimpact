import { Octokit } from "@octokit/rest";
import { db } from "@/lib/db/client";
import {
  IntegrationToken,
  integrationTokens,
  githubRepos,
} from "@/lib/db/schema";
import { and, desc, eq, or } from "drizzle-orm";

export type GitHubAuthType = "pat" | "oauth" | "app";

export interface GitHubClientResult {
  octokit: Octokit;
  username: string;
  authType: GitHubAuthType;
  orgName: string | null;
  selectedRepos: string[] | null;
}

export async function getActiveIntegrationToken(
  userId: string,
): Promise<IntegrationToken | null> {
  const [token] = await db
    .select()
    .from(integrationTokens)
    .where(
      and(
        eq(integrationTokens.userId, userId),
        or(
          eq(integrationTokens.tokenType, "pat"),
          eq(integrationTokens.tokenType, "classic_pat"),
        ),
      ),
    )
    .orderBy(desc(integrationTokens.updatedAt))
    .limit(1);

  return token || null;
}

/**
 * Creates an authenticated Octokit client for a user
 * Handles PAT, OAuth, and GitHub App authentication
 */
export async function createGitHubClient(
  userId: string,
): Promise<GitHubClientResult> {
  // Get all tokens for user
  const activeToken = await getActiveIntegrationToken(userId);

  let octokit: Octokit;
  let authType: GitHubAuthType;
  let orgName: string | null = null;

  const tenantRepos = await db
    .select()
    .from(githubRepos)
    .where(eq(githubRepos.tenantId, userId));
  const selectedRepos =
    tenantRepos.length > 0 ? tenantRepos.map((r) => r.fullName) : null;
  // if (
  //   activeToken &&
  //   (activeToken.tokenType === "pat" || activeToken.tokenType === "classic_pat")
  // ) {
  //   // Classic PAT or Fine-grained PAT
  //   const token = decrypt(activeToken.accessToken);
  //   octokit = new Octokit({ auth: token });
  //   authType = "pat";
  //   orgName = activeToken.orgLogin || null;
  // } else
  if (activeToken && activeToken.tokenType === "oauth") {
    // OAuth token from login
    octokit = new Octokit({ auth: activeToken.accessToken });
    authType = "oauth";
  } else {
    throw new Error("No GitHub authentication found");
  }

  // Get username
  const { data: user } = await octokit.rest.users.getAuthenticated();

  return {
    octokit,
    username: user.login,
    authType,
    orgName,
    selectedRepos,
  };
}
