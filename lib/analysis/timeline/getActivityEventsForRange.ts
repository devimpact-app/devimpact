import { and, between, eq, isNotNull, or } from "drizzle-orm";
import {
  githubPrCommits,
  githubPrs,
  pullRequests,
  reviews,
} from "@/lib/db/schema";
import { db } from "@/lib/db/client";
import { ActivityEvent } from "@/types/api/timeline";

type ActivityQueryParams = {
  tenantId: string;
  start: Date;
  end: Date;
  limit?: number;
};

export async function getActivityEventsForRange(
  params: ActivityQueryParams,
): Promise<ActivityEvent[]> {
  const { tenantId, start, end, limit = 200 } = params;

  // 1) Fetch PR events in range
  const prRows = await db
    .select()
    .from(pullRequests)
    .where(
      and(
        eq(pullRequests.tenantId, tenantId),
        eq(pullRequests.authorIsTenant, true),
        or(
          between(pullRequests.createdAt, start, end),
          between(pullRequests.mergedAt, start, end),
        ),
      ),
    );

  // 2) Fetch reviews in range
  const reviewRows = await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.tenantId, tenantId),
        eq(reviews.reviewerIsTenant, true),
        isNotNull(reviews.submittedAt),
        between(reviews.submittedAt, start, end),
      ),
    );

  // Commits
  const commitRows = await db
    .select({
      commit: githubPrCommits,
      rawPr: githubPrs,
      pr: pullRequests,
    })
    .from(githubPrCommits)
    .leftJoin(githubPrs, eq(githubPrCommits.prId, githubPrs.id))
    .leftJoin(pullRequests, eq(pullRequests.githubPrId, githubPrs.id))
    .where(
      and(
        eq(githubPrCommits.tenantId, tenantId),
        eq(pullRequests.authorIsTenant, true),
        isNotNull(githubPrCommits.committedAt),
        between(githubPrCommits.committedAt, start, end),
      ),
    );

  const events: ActivityEvent[] = [];

  // Map PRs → ActivityEvents
  for (const pr of prRows) {
    // Opened
    if (pr.createdAt && pr.createdAt >= start && pr.createdAt <= end) {
      events.push({
        id: `pr_opened:${pr.id}`,
        kind: "pr_opened",
        source: "github",
        occurredAt: pr.createdAt.toISOString(),
        actor: {
          login: pr.prAuthorLogin,
        },
        title: `Opened “${pr.title}”`,
        subtitle: `${pr.repoFullName} • #${pr.prNumber}`,
        meta: {
          prNumber: pr.prNumber,
          repoFullName: pr.repoFullName,
          linesChanged: pr.linesChanged ?? undefined,
          filesChanged: pr.filesChanged ?? undefined,
          stateLabel: pr.state,
        },
        links: {
          htmlUrl: pr.htmlUrl ?? undefined,
        },
      });
    }

    // Merged
    if (pr.mergedAt && pr.mergedAt >= start && pr.mergedAt <= end) {
      events.push({
        id: `pr_merged:${pr.id}`,
        kind: "pr_merged",
        source: "github",
        occurredAt: pr.mergedAt.toISOString(),
        actor: {
          login: pr.prAuthorLogin,
        },
        title: `Merged “${pr.title}”`,
        subtitle: `${pr.repoFullName} • #${pr.prNumber}`,
        meta: {
          prNumber: pr.prNumber,
          repoFullName: pr.repoFullName,
          linesChanged: pr.linesChanged ?? undefined,
          filesChanged: pr.filesChanged ?? undefined,
          stateLabel: pr.state,
        },
        links: {
          htmlUrl: pr.htmlUrl ?? undefined,
        },
      });
    }
  }

  // Map Reviews → ActivityEvents
  for (const r of reviewRows) {
    if (!r.submittedAt) continue;
    events.push({
      id: `review_submitted:${r.id}`,
      kind: "review_submitted",
      source: "github",
      occurredAt: r.submittedAt.toISOString(),
      actor: {
        login: r.reviewerLogin,
      },
      title: `Reviewed PR #${r.prNumber}`,
      subtitle: `${r.repoFullName}`,
      meta: {
        prNumber: r.prNumber,
        repoFullName: r.repoFullName,
        reviewLatencySeconds: r.reviewLatencySeconds ?? undefined,
        isFirstResponder: r.wasFirstReview ?? undefined,
      },
      links: {
        htmlUrl: r.htmlUrl ?? undefined,
      },
    });
  }

  for (const row of commitRows) {
    const { commit, pr } = row;
    const committedAt = commit.committedAt ?? commit.fetchedAt;
    if (!committedAt) continue;

    // Use first line of commit message as title
    const firstLine = commit.message.split("\n")[0];
    const subtitleParts: string[] = [];
    if (pr?.repoFullName) subtitleParts.push(pr.repoFullName);
    if (pr?.prNumber) subtitleParts.push(`#${pr.prNumber}`);
    const subtitle = subtitleParts.join(" • ") || undefined;

    events.push({
      id: `pr_commit:${commit.id}`,
      kind: "pr_commit",
      source: "github",
      occurredAt: committedAt.toISOString(),
      actor: {
        login: commit.authorGithubLogin,
      },
      title: firstLine,
      subtitle,
      meta: {
        prNumber: pr?.prNumber ?? undefined,
        repoFullName: pr?.repoFullName ?? undefined,
      },
      links: {
        htmlUrl: commit.htmlUrl,
      },
    });
  }

  // 3) Sort by occurredAt DESC and trim to limit
  events.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return events.slice(0, limit);
}
