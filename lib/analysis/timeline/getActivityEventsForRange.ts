import { ActivityEvent } from '@/types/api/timeline';
import { ActivityQueryParams } from './types';
import { getAuthoredPrs } from './getAuthoredPrs';
import { getAuthoredReviews } from './getAuthoredReviews';
import { getAuthoredCommits } from './getAuthoredCommits';
import { getActivityEventForPr, getActivityEventForReview } from './helpers';

export async function getActivityEventsForRange(
  params: ActivityQueryParams
): Promise<ActivityEvent[]> {
  const { start, end, limit = 200 } = params;

  const prRows = await getAuthoredPrs(params);
  const reviewRows = await getAuthoredReviews(params, { joinWithPrs: true });
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
          prTitle: pr.title,
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
      events.push(getActivityEventForPr(pr));
    }
  }

  // Map Reviews → ActivityEvents
  for (const row of reviewRows) {
    const r = row.review;
    if (!r.submittedAt) continue;
    events.push(getActivityEventForReview(r, row.pr?.title));
  }

  for (const row of commitRows) {
    const { commit, pr } = row;
    const committedAt = commit.committedAt ?? commit.fetchedAt;
    if (!committedAt) continue;

    let title;
    if (pr?.title) {
      title = `Commit in "${pr?.title}"`;
    } else {
      title = 'Commit in PR';
    }
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
      title,
      subtitle,
      meta: {
        prTitle: pr?.title,
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
