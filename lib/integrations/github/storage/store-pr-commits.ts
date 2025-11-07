import { db } from "@/lib/db/client";
import { githubPrCommits } from "@/lib/db/schema";
import { GitHubPRCommit } from "../api/types";

export async function storePRCommits(
  prId: string,
  userId: string,
  commits: GitHubPRCommit[],
  username: string,
): Promise<void> {
  if (commits.length === 0) return;

  await db
    .insert(githubPrCommits)
    .values(
      commits.map((c) => ({
        tenantId: userId,
        prId,
        sha: c.sha,
        message: c.commit.message,
        committedAt: c.commit.committer?.date
          ? new Date(c.commit.committer.date)
          : null,
        htmlUrl: c.html_url,
        authorGithubLogin: username,
      })),
    )
    .onConflictDoNothing();
}
