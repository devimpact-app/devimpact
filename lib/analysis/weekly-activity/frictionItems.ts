import { PullRequest } from '@/lib/db/schema';
import { FrictionItem } from '@/types/api/weekly-activity';

const SLOW_FIRST_REVIEW_THRESHOLD_HOURS = 18;
const HIGH_DISCUSSION_COMMENTS = 8;
const HIGH_DISCUSSION_REVIEWS = 5;
const LARGE_LINES_THRESHOLD = 800; // total lines changed
const LARGE_FILES_THRESHOLD = 25; // number of files
const VERY_LARGE_LINES_THRESHOLD = 1500;
const LONG_LEAD_TIME_SECONDS = 7 * 24 * 60 * 60; // 7 days
const LOW_COMMITS_THRESHOLD = 3;
const LOW_REVIEW_COMMENTS_THRESHOLD = 5;

interface Input {
  authoredPrs: PullRequest[];
}

function getPrInfo(pr: PullRequest) {
  return {
    prId: pr.id,
    number: pr.prNumber,
    title: pr.title,
    repo: pr.repoFullName,
    htmlUrl: pr.htmlUrl,
  };
}

export function deriveFrictionFollowups(input: Input) {
  const { authoredPrs } = input;

  const items: FrictionItem[] = [];

  // Multiple iterations
  for (const pr of authoredPrs) {
    const hasMultipleIterations = pr.reviewRounds > 1;

    if (hasMultipleIterations) {
      items.push({
        kind: 'iteration',
        id: pr.id,
        relatedPr: getPrInfo(pr),
        text: `PR #${pr.prNumber} required multiple review rounds.`,
      });
    }

    // Long time to first review
    const slowFirstReview =
      pr.timeToFirstReviewSeconds !== null &&
      pr.timeToFirstReviewSeconds > SLOW_FIRST_REVIEW_THRESHOLD_HOURS * 3600;

    if (slowFirstReview) {
      items.push({
        kind: 'latency',
        id: pr.id,
        relatedPr: getPrInfo(pr),
        text: `PR #${pr.prNumber} waited a long time for the first review.`,
      });
    }

    // High discussion volume
    const isHighDiscussion =
      pr.reviewCommentsCount >= HIGH_DISCUSSION_COMMENTS ||
      pr.reviewsCount >= HIGH_DISCUSSION_REVIEWS;

    if (isHighDiscussion) {
      items.push({
        kind: 'other',
        id: pr.id,
        relatedPr: getPrInfo(pr),
        text: `PR #${pr.prNumber} had a long discussion with reviewers.`,
      });
    }

    // Large surface area
    const isLargeSurfaceArea =
      pr.linesChanged >= VERY_LARGE_LINES_THRESHOLD ||
      (pr.linesChanged >= LARGE_LINES_THRESHOLD &&
        pr.filesChanged >= LARGE_FILES_THRESHOLD);

    if (isLargeSurfaceArea) {
      items.push({
        kind: 'other',
        id: pr.id,
        relatedPr: getPrInfo(pr),
        text: `PR #${pr.prNumber} touched many lines/files.`,
      });
    }

    // Long gaps
    const hasLeadTime =
      pr.leadTimeSeconds !== null && pr.leadTimeSeconds !== undefined;
    const isLongLeadTime =
      hasLeadTime && pr.leadTimeSeconds! > LONG_LEAD_TIME_SECONDS;
    const isLowActivity =
      pr.commitsCount < LOW_COMMITS_THRESHOLD &&
      pr.reviewCommentsCount < LOW_REVIEW_COMMENTS_THRESHOLD;

    if (isLongLeadTime && isLowActivity) {
      items.push({
        kind: 'other',
        id: pr.id,
        relatedPr: getPrInfo(pr),
        text: `PR #${pr.prNumber} had long gaps in progress.`,
      });
    }
  }

  return {
    items,
  };
}
