import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { db } from "@/lib/db/client";
import { integrationTokens } from "@/lib/db/schema";
import { decrypt } from "@/lib/utils/crypto";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

export type GitHubAuthType = "pat" | "oauth" | "app";

export interface GitHubClientResult {
  octokit: Octokit;
  username: string;
  authType: GitHubAuthType;
}

/**
 * Creates an authenticated Octokit client for a user
 * Handles PAT, OAuth, and GitHub App authentication
 */
export async function createGitHubClient(
  userId: string,
): Promise<GitHubClientResult> {
  // Get all tokens for user
  const tokens = await db
    .select()
    .from(integrationTokens)
    .where(eq(integrationTokens.userId, userId));

  const patToken = tokens.find((t) => t.tokenType === "pat");
  const oauthToken = tokens.find((t) => t.tokenType === "oauth");
  const appInstallation = tokens.find((t) => t.tokenType === "app");

  let octokit: Octokit;
  let authType: GitHubAuthType;

  // Priority: PAT > OAuth > GitHub App
  if (patToken) {
    // Classic PAT or Fine-grained PAT
    const token = decrypt(patToken.accessToken);
    octokit = new Octokit({ auth: token });
    authType = "pat";
  } else if (oauthToken) {
    // OAuth token from login
    octokit = new Octokit({ auth: oauthToken.accessToken });
    authType = "oauth";
  } else if (appInstallation) {
    // GitHub App installation
    const installationId = appInstallation.accessToken; // Store installation_id here

    // Load private key
    const privateKeyPath = path.join(
      process.cwd(),
      "github-app-private-key.pem",
    );
    const privateKey = fs.readFileSync(privateKeyPath, "utf8");

    // Get app ID from env
    const appId = process.env.GITHUB_APP_ID!;

    octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId,
        privateKey,
        installationId: parseInt(installationId, 10),
      },
    });
    authType = "app";
  } else {
    throw new Error("No GitHub authentication found");
  }

  // Get username
  const { data: user } = await octokit.rest.users.getAuthenticated();

  return {
    octokit,
    username: user.login,
    authType,
  };
}
