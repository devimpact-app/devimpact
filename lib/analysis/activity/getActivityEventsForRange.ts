import { ActivityEvent } from '@/types/api/timeline';
import { ActivityQueryParams } from './types';
import { getAuthoredPrs } from './getAuthoredPrs';
import { getAuthoredReviews } from './getAuthoredReviews';
import { getAuthoredCommits } from './getAuthoredCommits';

export async function getActivityEventsForRange(
  params: ActivityQueryParams
): Promise<ActivityEvent[]> {
  const { start, end, limit = 200 } = params;

  const prRows = await getAuthoredPrs(params);
  const reviewRows = await getAuthoredReviews(params);
  const commitRows = await getAuthoredCommits(params);

  const events: ActivityEvent[] = [];

  // Map PRs → ActivityEvents
  for (const pr of prRows) {
    // Opened
    if (pr.createdAt && pr.createdAt >= start && pr.createdAt <= end) {
      events.push({
        id: `pr_opened:${pr.id}`,
        kind: 'pr_opened',
        source: 'github',
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
        kind: 'pr_merged',
        source: 'github',
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
      kind: 'review_submitted',
      source: 'github',
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
    const firstLine = commit.message.split('\n')[0];
    const subtitleParts: string[] = [];
    if (pr?.repoFullName) subtitleParts.push(pr.repoFullName);
    if (pr?.prNumber) subtitleParts.push(`#${pr.prNumber}`);
    const subtitle = subtitleParts.join(' • ') || undefined;

    events.push({
      id: `pr_commit:${commit.id}`,
      kind: 'pr_commit',
      source: 'github',
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
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  return events.slice(0, limit);
}
