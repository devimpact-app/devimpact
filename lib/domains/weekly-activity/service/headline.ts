import type { WeeklyActivity } from '@/types/api/weekly-activity';

type HeadlineInput = {
  softStats: WeeklyActivity['softStats'];
  shipped: WeeklyActivity['shipped'];
  whatYouWorkedOn: WeeklyActivity['whatYouWorkedOn'];
  reviewsCollab: WeeklyActivity['reviewsCollab'];
  frictionFollowups: WeeklyActivity['frictionFollowups'];
};

export function buildWeeklyHeadline({
  softStats,
  shipped,
  whatYouWorkedOn,
  reviewsCollab,
  frictionFollowups,
}: HeadlineInput): string {
  const frictionItems = frictionFollowups?.items ?? [];
  const authored = softStats.prsAuthored;
  const reviewed = softStats.prsReviewed;
  const hasShipped = shipped.length > 0;
  const shippedMany = shipped.length >= 2;
  const frictionCount = frictionItems.length;
  const focusAreas = whatYouWorkedOn?.focusAreas ?? [];
  const hasFocus = focusAreas.length > 0;

  const iterationFrictionCount = frictionItems.filter(
    (item) => item.kind === 'iteration'
  ).length;
  const latencyFrictionCount = frictionItems.filter(
    (item) => item.kind === 'latency'
  ).length;

  // 1) Very light week
  if (authored === 0 && reviewed === 0) {
    return 'A light week with minimal GitHub activity.';
  }

  // 2) Strong shipping week, smooth reviews
  if (shippedMany && frictionCount === 0) {
    if (hasFocus && focusAreas.length >= 2) {
      return `You shipped multiple changes focused on ${focusAreas[0]} and ${focusAreas[1]}.`;
    }
    if (hasFocus) {
      return `You shipped multiple meaningful changes focused on ${focusAreas[0]}.`;
    }
    return 'You shipped multiple meaningful changes this week.';
  }

  // 3) Strong shipping week with some friction
  if (hasShipped && frictionCount > 0) {
    if (iterationFrictionCount > 0 || latencyFrictionCount > 0) {
      return 'You shipped important work but hit some review friction along the way.';
    }
    return 'You shipped important work with a few areas worth revisiting.';
  }

  // 4) Review-heavy week
  if ((reviewsCollab?.totalReviewed ?? 0) >= 3 && authored <= 1) {
    if ((reviewsCollab?.firstResponderCount ?? 0) >= 2) {
      return 'You spent much of the week helping unblock teammates’ PRs.';
    }
    return 'You spent much of the week supporting teammates’ PRs.';
  }

  // 5) Focus-driven week (no strong shipping / friction story)
  if (hasFocus && focusAreas.length >= 2) {
    return `Most of your work centered on ${focusAreas[0]} and ${focusAreas[1]}.`;
  }
  if (hasFocus) {
    return `Your work this week focused on ${focusAreas[0]}.`;
  }

  // 6) Generic “steady progress” fallback
  return 'A steady week of progress across your repos.';
}
