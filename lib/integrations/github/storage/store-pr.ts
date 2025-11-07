import { db } from "@/lib/db/client";
import { githubPrs } from "@/lib/db/schema";
import { GitHubSearchPullRequest } from "../api/types/PullRequest";

export async function storePR(
  userId: string,
  pr: GitHubSearchPullRequest,
  repoFullName: string,
  files: any[],
  commits: any[],
): Promise<string> {
  const [repoOwner, repoName] = repoFullName.split("/");

  const mergedAt =
    pr.state === "merged"
      ? pr.closed_at
        ? new Date(pr.closed_at)
        : null
      : null;

  const [insertedPR] = await db
    .insert(githubPrs)
    .values({
      externalId: pr.id.toString(),
      externalNodeId: pr.node_id,
      tenantId: userId,
      prNumber: pr.number,
      repoFullName,
      repoOwner,
      repoName,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      draft: pr.draft || false,
      authorGithubLogin: pr.user?.login || "unknown",
      additions: files.reduce((sum, f) => sum + f.additions, 0),
      deletions: files.reduce((sum, f) => sum + f.deletions, 0),
      changedFiles: files.length,
      commitsCount: commits.length,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      mergedAt,
      htmlUrl: pr.html_url,
    })
    .onConflictDoUpdate({
      target: [githubPrs.tenantId, githubPrs.repoFullName, githubPrs.prNumber],
      set: {
        state: pr.state,
        updatedAt: new Date(pr.updated_at),
        mergedAt,
        fetchedAt: new Date(),
      },
    })
    .returning({ id: githubPrs.id });

  return insertedPR.id;
}
