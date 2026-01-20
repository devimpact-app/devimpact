import { db } from '@/lib/db/client';
import { pullRequests } from '@/lib/db/schema';
import { activityEvents } from '@/lib/db/schema/activity';
import { and, eq, gt, isNotNull, isNull, or, sql } from 'drizzle-orm';

type DeriveFromPullRequestIdsArgs = {
  tenantId: string;
  now?: Date;
  authoredOnly?: boolean;
};

type DeriveResult = {
  upserted: number;
  skipped: number;
};

function shortRepo(repoFullName: string) {
  const parts = repoFullName.split('/');
  return parts.length === 2 ? parts[1] : repoFullName;
}

function buildSubtitle(pr: {
  repoFullName: string;
  linesChanged: number;
  filesChanged: number;
  touchedTests: boolean;
}) {
  const bits: string[] = [];
  bits.push(shortRepo(pr.repoFullName));
  bits.push(`${pr.linesChanged} lines`);
  bits.push(`${pr.filesChanged} files`);
  if (pr.touchedTests) bits.push('tests');
  return bits.join(' • ');
}

/**
 * Derives curated `activity_events` rows from canonical `pull_requests` rows.
 * Idempotent upsert keyed by (tenantId, source, sourceEntityTable, sourceEntityId, eventType).
 */
export async function deriveActivityEventsFromPullRequests(
  args: DeriveFromPullRequestIdsArgs
): Promise<DeriveResult> {
  const tenantId = args.tenantId;
  const now = args.now ?? new Date();
  const authoredOnly = args.authoredOnly ?? true;

  const prs = await db
    .select({
      id: pullRequests.id,
      tenantId: pullRequests.tenantId,
      repoFullName: pullRequests.repoFullName,
      prNumber: pullRequests.prNumber,
      title: pullRequests.title,
      htmlUrl: pullRequests.htmlUrl,
      state: pullRequests.state,
      createdAt: pullRequests.createdAt,
      mergedAt: pullRequests.mergedAt,
      closedAt: pullRequests.closedAt,
      authorIsTenant: pullRequests.authorIsTenant,
      linesChanged: pullRequests.linesChanged,
      filesChanged: pullRequests.filesChanged,
      commitsCount: pullRequests.commitsCount,
      touchedTests: pullRequests.touchedTests,
      reviewRounds: pullRequests.reviewRounds,
      uniqueReviewers: pullRequests.uniqueReviewers,
    })
    .from(pullRequests)
    .leftJoin(
      activityEvents,
      and(
        eq(activityEvents.tenantId, pullRequests.tenantId),
        eq(activityEvents.source, 'github'),
        eq(activityEvents.sourceEntityTable, 'pull_requests'),
        eq(activityEvents.sourceEntityId, pullRequests.id),
        eq(activityEvents.eventType, 'pr_merged')
      )
    )
    .where(
      and(
        eq(pullRequests.tenantId, tenantId),
        isNotNull(pullRequests.mergedAt),
        authoredOnly ? eq(pullRequests.authorIsTenant, true) : sql`TRUE`,
        or(
          isNull(activityEvents.id),
          gt(pullRequests.sourceUpdatedAt, activityEvents.derivedAt)
        )
      )
    );

  const toUpsert: Array<typeof activityEvents.$inferInsert> = [];
  let skipped = 0;

  for (const pr of prs) {
    toUpsert.push({
      tenantId,
      source: 'github',
      eventType: 'pr_merged',
      occurredAt: pr.mergedAt!,
      endAt: null,
      title: pr.title,
      subtitle: buildSubtitle(pr),
      url: pr.htmlUrl,
      sourceEntityTable: 'pull_requests',
      sourceEntityId: pr.id,
      repoFullName: pr.repoFullName,
      prNumber: pr.prNumber,
      recurringEventId: null,
      metadata: {
        kind: 'pr',
        size: {
          linesChanged: pr.linesChanged ?? 0,
          filesChanged: pr.filesChanged ?? 0,
          commitsCount: pr.commitsCount ?? undefined,
        },
        shape: { touchedTests: !!pr.touchedTests },
        process: {
          reviewRounds: pr.reviewRounds ?? undefined,
          uniqueReviewers: pr.uniqueReviewers ?? undefined,
        },
      },
      derivedVersion: 1,
      derivedAt: now,
    });
    continue;
  }

  if (!toUpsert.length) return { upserted: 0, skipped };

  const CHUNK = 500;
  let upserted = 0;
  for (let i = 0; i < toUpsert.length; i += CHUNK) {
    const chunk = toUpsert.slice(i, i + CHUNK);

    const ret = await db
      .insert(activityEvents)
      .values(chunk)
      .onConflictDoUpdate({
        target: [
          activityEvents.tenantId,
          activityEvents.source,
          activityEvents.sourceEntityTable,
          activityEvents.sourceEntityId,
          activityEvents.eventType,
        ],
        set: {
          occurredAt: sql`excluded.occurred_at`,
          title: sql`excluded.title`,
          subtitle: sql`excluded.subtitle`,
          url: sql`excluded.url`,
          repoFullName: sql`excluded.repo_full_name`,
          prNumber: sql`excluded.pr_number`,
          metadata: sql`excluded.metadata`,
          derivedVersion: sql`excluded.derived_version`,
          derivedAt: sql`excluded.derived_at`,
        },
      })
      .returning({ id: activityEvents.id });

    upserted += ret.length;
  }

  return { upserted, skipped };
}
