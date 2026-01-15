import { ActivityEvent } from '@/types/api/timeline';
import { ActivityQueryParams } from '../types';
import { getAuthoredPrs } from '../db/getAuthoredPrs';
import { getAuthoredReviews } from '../db/getAuthoredReviews';
import { getAuthoredCommits } from '../db/getAuthoredCommits';
import {
  serializeActivityEventFromPr,
  serializeActivityEventFromReview,
} from '../api/serializers';
import { getCalendarEventsForRange } from '../db/getCalendarEventsForRange';
import { CalendarEvent } from '@/lib/db/schema/gcal';
import { formatDateTime } from '@/lib/utils/date';

export async function getActivityEventsForRange(
  params: ActivityQueryParams & {
    includeMeetings?: boolean;
  }
): Promise<ActivityEvent[]> {
  const { start, end, limit = 200 } = params;

  const activityParams = {
    ...params,
    limit: 200,
  };
  const prRows = await getAuthoredPrs(activityParams);
  const reviewRows = await getAuthoredReviews(activityParams, {
    joinWithPrs: true,
  });
  const commitRows = await getAuthoredCommits(activityParams);
  let calendarEvents: CalendarEvent[] = [];
  if (params.includeMeetings) {
    calendarEvents = await getCalendarEventsForRange(activityParams);
  }

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
      events.push(serializeActivityEventFromPr(pr));
    }
  }

  // Map Reviews → ActivityEvents
  for (const row of reviewRows) {
    const r = row.review;
    if (!r.submittedAt) continue;
    if (r.submittedAt < start || r.submittedAt > end) continue;
    events.push(serializeActivityEventFromReview(r, row.pr?.title));
  }

  for (const row of commitRows) {
    const { commit, pr } = row;
    const committedAt = commit.committedAt ?? commit.fetchedAt;
    if (!committedAt) continue;
    if (committedAt < start || committedAt > end) continue;

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

  for (const row of calendarEvents) {
    events.push({
      id: `meeting:${row.id}`,
      kind: 'meeting',
      source: 'gcal',
      occurredAt: row.startAt.toISOString(),
      actor: {
        login: '', // No specific actor for meetings
      },
      title: row.title ?? 'Meeting started',
      subtitle: `Meeting · ${formatDateTime(row.startAt)}`,
    });
  }

  events.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  return events.slice(0, limit);
}
