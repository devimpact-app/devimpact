import { db } from '@/lib/db/client';
import { pullRequests, reviews } from '@/lib/db/schema';
import { activityEvents } from '@/lib/db/schema/activity';
import { and, eq, inArray, sql } from 'drizzle-orm';

type DeriveFromReviewIdsArgs = {
  tenantId: string;
  reviewIds: string[];
  now?: Date;
  reviewerOnly?: boolean;
  includeNonSubmitted?: boolean;
  joinPrTitle?: boolean;
};

type DeriveResult = {
  upserted: number;
  skipped: number;
};

function shortRepo(repoFullName: string) {
  const parts = repoFullName.split('/');
  return parts.length === 2 ? parts[1] : repoFullName;
}

function decisionFromReview(r: {
  isApproval: boolean;
  isChangeRequest: boolean;
  isCommentOnly: boolean;
  state: string;
}): 'approved' | 'changes_requested' | 'commented' | null {
  if (r.isApproval) return 'approved';
  if (r.isChangeRequest) return 'changes_requested';
  if (r.isCommentOnly) return 'commented';

  // fallback to state if flags ever drift
  const s = (r.state ?? '').toUpperCase();
  if (s === 'APPROVED') return 'approved';
  if (s === 'CHANGES_REQUESTED') return 'changes_requested';
  if (s === 'COMMENTED') return 'commented';
  return null;
}

function buildSubtitle(r: {
  repoFullName: string;
  prNumber: number;
  reviewCommentsCount: number;
  wasDirectlyRequested: boolean;
  wasFirstReview: boolean;
  isBlockingReview: boolean;
}) {
  const bits: string[] = [];
  bits.push(shortRepo(r.repoFullName));
  bits.push(`#${r.prNumber}`);

  if (r.reviewCommentsCount > 0) bits.push(`${r.reviewCommentsCount} comments`);
  if (r.wasDirectlyRequested) bits.push('requested');
  if (r.wasFirstReview) bits.push('first responder');
  if (r.isBlockingReview) bits.push('blocking');

  return bits.join(' • ');
}

function titleForDecision(
  decision: 'approved' | 'changes_requested' | 'commented',
  prTitle?: string | null
) {
  const verb =
    decision === 'approved'
      ? 'Approved'
      : decision === 'changes_requested'
        ? 'Requested changes'
        : 'Left feedback';

  return prTitle ? `${verb}: ${prTitle}` : verb;
}

/**
 * Derives curated `activity_events` rows from canonical `reviews` rows.
 * Idempotent upsert keyed by (tenantId, source, sourceEntityTable, sourceEntityId, eventType).
 */
export async function deriveActivityEventsFromReviewIds(
  args: DeriveFromReviewIdsArgs
): Promise<DeriveResult> {
  const tenantId = args.tenantId;
  const now = args.now ?? new Date();
  const reviewerOnly = args.reviewerOnly ?? true;
  const includeNonSubmitted = args.includeNonSubmitted ?? false;
  const joinPrTitle = args.joinPrTitle ?? false;

  if (!args.reviewIds.length) return { upserted: 0, skipped: 0 };

  const base = db
    .select({
      id: reviews.id,
      tenantId: reviews.tenantId,
      prId: reviews.prId,
      prNumber: reviews.prNumber,
      repoFullName: reviews.repoFullName,
      htmlUrl: reviews.htmlUrl,
      state: reviews.state,
      submittedAt: reviews.submittedAt,
      reviewerIsTenant: reviews.reviewerIsTenant,
      isApproval: reviews.isApproval,
      isChangeRequest: reviews.isChangeRequest,
      isCommentOnly: reviews.isCommentOnly,
      wasDirectlyRequested: reviews.wasDirectlyRequested,
      wasFirstReview: reviews.wasFirstReview,
      isBlockingReview: reviews.isBlockingReview,
      reviewCommentsCount: reviews.reviewCommentsCount,
      prTitle: joinPrTitle ? pullRequests.title : sql<null>`null`,
    })
    .from(reviews)
    .where(
      and(eq(reviews.tenantId, tenantId), inArray(reviews.id, args.reviewIds))
    );

  const rows = joinPrTitle
    ? await base.leftJoin(pullRequests, eq(reviews.prId, pullRequests.id))
    : await base;

  const normalized = (rows as any[]).map((r) => {
    if (!joinPrTitle) return r;
    if (r?.reviews && r?.pull_requests) {
      return {
        ...r.reviews,
        prTitle: r.pull_requests?.title ?? null,
      };
    }
    return r;
  });

  const toUpsert: Array<typeof activityEvents.$inferInsert> = [];
  let skipped = 0;
  for (const r of normalized) {
    if (reviewerOnly && !r.reviewerIsTenant) {
      skipped += 1;
      continue;
    }

    if (!r.submittedAt) {
      if (!includeNonSubmitted) {
        skipped += 1;
        continue;
      }
    }

    const decision = decisionFromReview(r);
    if (!decision) {
      skipped += 1;
      continue;
    }

    toUpsert.push({
      tenantId,
      source: 'github',
      eventType: 'review_submitted',
      occurredAt: r.submittedAt ?? now,
      endAt: null,
      title: titleForDecision(
        decision,
        joinPrTitle ? (r.prTitle ?? null) : null
      ),
      subtitle: buildSubtitle({
        repoFullName: r.repoFullName,
        prNumber: r.prNumber,
        reviewCommentsCount: r.reviewCommentsCount ?? 0,
        wasDirectlyRequested: !!r.wasDirectlyRequested,
        wasFirstReview: !!r.wasFirstReview,
        isBlockingReview: !!r.isBlockingReview,
      }),
      url: r.htmlUrl,
      sourceEntityTable: 'reviews',
      sourceEntityId: r.id,
      repoFullName: r.repoFullName,
      prNumber: r.prNumber,
      recurringEventId: null,
      metadata: {
        kind: 'review',
        decision,
        depth: { commentsCount: r.reviewCommentsCount ?? 0 },
        role: {
          wasDirectlyRequested: !!r.wasDirectlyRequested,
          wasFirstReview: r.wasFirstReview ?? undefined,
          isBlocking: r.isBlockingReview ?? undefined,
        },
      },
      derivedVersion: 1,
      derivedAt: now,
    });
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
