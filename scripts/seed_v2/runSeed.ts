import 'dotenv/config';
import { closeDb, db } from '@/lib/db/client';
import {
  githubPrs,
  githubReviews,
  prSummaries,
  pullRequests,
  reviews,
  users,
} from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { resetTenantData } from './reset';
import { buildSeedTimeContext } from './helpers';
import { readFile } from 'fs/promises';
import {
  SeedPullRequestsFile,
  SeedPullRequestsFileSchema,
} from './schema/seedPullRequest';
import path from 'path';
import { seedPullRequestToDbRows } from './derive/from-seed-pull-request';
import { SeedReviewsFile, SeedReviewsFileSchema } from './schema/seedReview';
import { seedReviewToDbRows } from './derive/from-seed-review';
import {
  SeedCalendarFile,
  SeedCalendarFileSchema,
} from './schema/seedCalendarEvent';
import {
  seedOneOffEventsToDbRows,
  seedRecurringSeriesToDbRows,
} from './derive/from-seed-calendar-events';
import { calendarEvents } from '@/lib/db/schema/gcal';
import { deriveActivityEventsFromCalendarEventIds } from '@/lib/analysis/activity/derive/from-calendar-events';
import { deriveActivityEventsFromPullRequestIds } from '@/lib/analysis/activity/derive/from-github-prs';
import { deriveActivityEventsFromReviewIds } from '@/lib/analysis/activity/derive/from-github-reviews';
import { runThreadingPipeline } from '@/lib/analysis/threads/runThreadingPipeline';

export async function loadSeedPullRequests(
  filepath: string
): Promise<SeedPullRequestsFile> {
  const raw = await readFile(filepath, 'utf-8');
  const json = JSON.parse(raw);
  const parsed = SeedPullRequestsFileSchema.parse(json);
  return parsed;
}

export async function loadSeedReviews(
  filepath: string
): Promise<SeedReviewsFile> {
  const raw = await readFile(filepath, 'utf-8');
  const json = JSON.parse(raw);
  const parsed = SeedReviewsFileSchema.parse(json);
  return parsed;
}

export async function loadSeedCalendarEvents(
  filepath: string
): Promise<SeedCalendarFile> {
  const raw = await readFile(filepath, 'utf-8');
  const json = JSON.parse(raw);
  const parsed = SeedCalendarFileSchema.parse(json);
  return parsed;
}

async function seedAccount(tenantId: string, githubUsername: string) {
  const timeCtx = buildSeedTimeContext();

  const prSeedPath = path.join(
    process.cwd(),
    'scripts',
    'seed_v2',
    'data',
    'pull_requests.json'
  );
  const prSeed = await loadSeedPullRequests(prSeedPath);
  const mappedPrs = prSeed.pullRequests.map((spr) =>
    seedPullRequestToDbRows(spr, {
      tenantId,
      githubUsername,
      timeCtx,
    })
  );
  mappedPrs.sort((a, b) => a.pr.createdAt.getTime() - b.pr.createdAt.getTime());

  const reviewSeedPath = path.join(
    process.cwd(),
    'scripts',
    'seed_v2',
    'data',
    'reviews.json'
  );
  const reviewSeed = await loadSeedReviews(reviewSeedPath);
  const mappedReviews = reviewSeed.reviews.map((rev) =>
    seedReviewToDbRows(rev, {
      tenantId,
      githubUsername,
      timeCtx,
    })
  );

  const githubPrRows = [
    ...mappedPrs.map((m) => m.githubPr),
    ...mappedReviews.map((r) => r.githubPr),
  ];
  const prRows = [
    ...mappedPrs.map((m) => m.pr),
    ...mappedReviews.map((r) => r.pr),
  ];
  const summaryRows = [
    ...mappedPrs.map((m) => m.summary),
    ...mappedReviews.map((r) => r.prSummary),
  ];
  const githubReviewRows = mappedReviews.map((r) => r.githubReview);
  const reviewRows = mappedReviews.map((r) => r.review);

  const calendarSeedPath = path.join(
    process.cwd(),
    'scripts',
    'seed_v2',
    'data',
    'calendar_events.json'
  );
  const calendarSeed = await loadSeedCalendarEvents(calendarSeedPath);
  const mappedSeriesEvents = calendarSeed.recurringSeries.flatMap((series) =>
    seedRecurringSeriesToDbRows(series, {
      tenantId,
      timeCtx,
      integrationTokenId: '7d6d6009-322d-4789-9100-7edf2c914124',
      calendarId: 'seed-calendar',
    })
  );
  const mappedOneOffEvents = seedOneOffEventsToDbRows(
    calendarSeed.oneOffEvents,
    {
      tenantId,
      timeCtx,
      integrationTokenId: '7d6d6009-322d-4789-9100-7edf2c914124',
      calendarId: 'seed-calendar',
    }
  );
  const calendarEventRows = [...mappedSeriesEvents, ...mappedOneOffEvents];

  let upsertedEvents: { id: string }[] = [];
  let upsertedPrs: { id: string }[] = [];
  let upsertedReviews: { id: string }[] = [];
  await db.transaction(async (tx) => {
    await tx
      .insert(githubPrs)
      .values(githubPrRows)
      .onConflictDoUpdate({
        target: [
          githubPrs.tenantId,
          githubPrs.repoFullName,
          githubPrs.prNumber,
        ],
        set: {
          title: sql`excluded.title`,
          body: sql`excluded.body`,
          state: sql`excluded.state`,
          draft: sql`excluded.draft`,
          authorGithubLogin: sql`excluded.author_github_login`,
          createdAt: sql`excluded.created_at`,
          updatedAt: sql`excluded.updated_at`,
          closedAt: sql`excluded.closed_at`,
          htmlUrl: sql`excluded.html_url`,
          fetchedAt: sql`excluded.fetched_at`,
        },
      });

    upsertedPrs = await tx
      .insert(pullRequests)
      .values(prRows)
      .onConflictDoUpdate({
        target: [pullRequests.githubPrId],
        set: {
          prNumber: sql`excluded.pr_number`,
          repoFullName: sql`excluded.repo_full_name`,
          title: sql`excluded.title`,
          state: sql`excluded.state`,
          prAuthorLogin: sql`excluded.pr_author_login`,
          htmlUrl: sql`excluded.html_url`,
          body: sql`excluded.body`,
          authorIsTenant: sql`excluded.author_is_tenant`,
          createdAt: sql`excluded.created_at`,
          mergedAt: sql`excluded.merged_at`,
          closedAt: sql`excluded.closed_at`,
          firstCommitAt: sql`excluded.first_commit_at`,
          lastReadyForReviewAt: sql`excluded.last_ready_for_review_at`,
          firstReviewAtForCycle: sql`excluded.first_review_at_for_cycle`,
          linesAdded: sql`excluded.lines_added`,
          linesDeleted: sql`excluded.lines_deleted`,
          linesChanged: sql`excluded.lines_changed`,
          filesChanged: sql`excluded.files_changed`,
          touchedTests: sql`excluded.touched_tests`,
          commitsCount: sql`excluded.commits_count`,
          reviewsCount: sql`excluded.reviews_count`,
          uniqueReviewers: sql`excluded.unique_reviewers`,
          reviewRounds: sql`excluded.review_rounds`,
          approvalsCount: sql`excluded.approvals_count`,
          changesRequestedCount: sql`excluded.changes_requested_count`,
          blockingReviewCount: sql`excluded.blocking_review_count`,
          nonBlockingReviewCount: sql`excluded.non_blocking_review_count`,
          hadForcePushes: sql`excluded.had_force_pushes`,
          wasApprovedBeforeMerge: sql`excluded.was_approved_before_merge`,
          sourceUpdatedAt: sql`excluded.source_updated_at`,
          normalizationVersion: sql`excluded.normalization_version`,
        },
      })
      .returning({ id: pullRequests.id });

    await tx
      .insert(prSummaries)
      .values(summaryRows)
      .onConflictDoUpdate({
        target: [prSummaries.prId],
        set: {
          repoFullName: sql`excluded.repo_full_name`,
          prNumber: sql`excluded.pr_number`,
          shortSummary: sql`excluded.short_summary`,
          longSummary: sql`excluded.long_summary`,
          highlights: sql`excluded.highlights`,
          typeTags: sql`excluded.type_tags`,
          domainTags: sql`excluded.domain_tags`,
          reviewFrictionTags: sql`excluded.review_friction_tags`,
          inputHash: sql`excluded.input_hash`,
          model: sql`excluded.model`,
          promptVersion: sql`excluded.prompt_version`,
          prUpdatedAt: sql`excluded.pr_updated_at`,
          updatedAt: sql`excluded.updated_at`,
        },
      });

    await tx
      .insert(githubReviews)
      .values(githubReviewRows)
      .onConflictDoUpdate({
        target: [githubReviews.reviewId],
        set: {
          state: sql`excluded.state`,
          body: sql`excluded.body`,
          reviewerGithubLogin: sql`excluded.reviewer_github_login`,
          prAuthorGithubLogin: sql`excluded.pr_author_github_login`,
          commitId: sql`excluded.commit_id`,
          authorAssociation: sql`excluded.author_association`,
          submittedAt: sql`excluded.submitted_at`,
          htmlUrl: sql`excluded.html_url`,
          fetchedAt: sql`excluded.fetched_at`,
        },
      });

    upsertedReviews = await tx
      .insert(reviews)
      .values(reviewRows)
      .onConflictDoUpdate({
        target: [reviews.githubReviewId],
        set: {
          prNumber: sql`excluded.pr_number`,
          repoFullName: sql`excluded.repo_full_name`,
          prAuthorLogin: sql`excluded.pr_author_login`,
          reviewerLogin: sql`excluded.reviewer_login`,
          reviewerIsTenant: sql`excluded.reviewer_is_tenant`,
          state: sql`excluded.state`,
          submittedAt: sql`excluded.submitted_at`,
          commitId: sql`excluded.commit_id`,
          htmlUrl: sql`excluded.html_url`,
          body: sql`excluded.body`,
          reviewLatencySeconds: sql`excluded.review_latency`,
          reviewAnchorAt: sql`excluded.review_anchor_at`,
          reviewAnchorType: sql`excluded.review_anchor_type`,
          anchorTeamSlug: sql`excluded.anchor_team_slug`,
          isApproval: sql`excluded.is_approval`,
          isChangeRequest: sql`excluded.is_change_request`,
          isCommentOnly: sql`excluded.is_comment_only`,
          wasDirectlyRequested: sql`excluded.was_directly_requested`,
          wasFirstReview: sql`excluded.was_first_review`,
          isBlockingReview: sql`excluded.is_blocking_review`,
          isNonBlockingReview: sql`excluded.is_non_blocking_review`,
          reviewCommentsCount: sql`excluded.review_comments_count`,
          sourceUpdatedAt: sql`excluded.source_updated_at`,
          normalizationVersion: sql`excluded.normalization_version`,
        },
      })
      .returning({ id: reviews.id });

    upsertedEvents = await tx
      .insert(calendarEvents)
      .values(calendarEventRows)
      .onConflictDoUpdate({
        target: [
          calendarEvents.tenantId,
          calendarEvents.integrationTokenId,
          calendarEvents.calendarId,
          calendarEvents.googleEventId,
        ],
        set: {
          recurringEventId: sql`excluded.recurring_event_id`,
          iCalUid: sql`excluded.ical_uid`,
          sequence: sql`excluded.sequence`,
          status: sql`excluded.status`,
          eventType: sql`excluded.event_type`,
          startAt: sql`excluded.start_at`,
          endAt: sql`excluded.end_at`,
          durationMinutes: sql`excluded.duration_minutes`,
          originalStartAt: sql`excluded.original_start_at`,
          isAllDay: sql`excluded.is_all_day`,
          eventTimeZone: sql`excluded.event_time_zone`,
          title: sql`excluded.title_redacted`,
          attendeesTotal: sql`excluded.attendees_total`,
          attendeesAccepted: sql`excluded.attendees_accepted`,
          attendeesDeclined: sql`excluded.attendees_declined`,
          attendeesNeedsAction: sql`excluded.attendees_needs_action`,
          selfResponseStatus: sql`excluded.self_response_status`,
          isOrganizerSelf: sql`excluded.is_organizer_self`,
          category: sql`excluded.category`,
          categorySubtype: sql`excluded.category_subtype`,
          categoryConfidence: sql`excluded.category_confidence`,
          categorySource: sql`excluded.category_source`,
          categoryVersion: sql`excluded.category_version`,
          createdAtGoogle: sql`excluded.created_at_google`,
          updatedAtGoogle: sql`excluded.updated_at_google`,
          lastSyncedAt: sql`excluded.last_synced_at`,
          deletedAt: null,
          updatedAt: sql`excluded.updated_at`,
        },
      })
      .returning({ id: calendarEvents.id });
  });

  console.log('deriving activity events from source tables');
  const { upserted: aecal, skipped: aecalSkipped } =
    await deriveActivityEventsFromCalendarEventIds({
      tenantId,
      calendarEventIds: upsertedEvents.map((e) => e.id),
      pastOnly: true,
    });
  const { upserted: aepr, skipped: aeprSkipped } =
    await deriveActivityEventsFromPullRequestIds({
      tenantId,
      prIds: upsertedPrs.map((pr) => pr.id),
      authoredOnly: true,
    });
  const { upserted: aereview, skipped: aereviewSkipped } =
    await deriveActivityEventsFromReviewIds({
      tenantId,
      reviewIds: upsertedReviews.map((r) => r.id),
      joinPrTitle: true,
    });

  console.log('Running thread pipeline');
  const { eligible, ineligible, threaded } = await runThreadingPipeline({
    tenantId,
    lookbackDays: 90,
  });

  return {
    prsSeeded: prRows.length,
    summariesSeeded: summaryRows.length,
    reviewsSeeded: reviewRows.length,
    activityEvents: {
      calendarUpserted: aecal,
      calendarSkipped: aecalSkipped,
      prsUpserted: aepr,
      prsSkipped: aeprSkipped,
      reviewsUpserted: aereview,
      reviewsSkipped: aereviewSkipped,
    },
    threading: {
      eligible,
      ineligible,
      threaded,
    },
    calendarEventsSeeded: calendarEventRows.length,
    startMondayISO: timeCtx.startMonday.toISOString(),
  };
}

const argv = process.argv.slice(2);
const hasFlag = (f: string) => argv.includes(f);

async function main() {
  try {
    const reset = hasFlag('--reset');
    const [me] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'ianr620@gmail.com'))
      .limit(1);

    if (!me) throw new Error('Seed needs an existing user with that email');

    const tenantId = me.id;

    if (reset) {
      console.log('🔄 Resetting existing seed data for tenant:', tenantId);
      await resetTenantData(tenantId);
    }

    const response = await seedAccount(tenantId, me.githubUsername);
    console.log(response);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await closeDb();
    process.exit();
  }
}

main();
