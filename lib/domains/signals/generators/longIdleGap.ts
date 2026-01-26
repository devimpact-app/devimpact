import { Signal } from '@/types/api/signals';
import { SignalContext } from '../types';
import { getPrRelatedItem } from '../helpers';

const LONG_LEAD_TIME_SECONDS = 7 * 24 * 60 * 60; // 7 days
const LOW_COMMITS_THRESHOLD = 3;
const LOW_REVIEW_COMMENTS_THRESHOLD = 5;

export function generateLongIdleGapSignals(ctx: SignalContext): Signal[] {
  const signals: Signal[] = [];

  for (const pr of ctx.authoredPrs) {
    const lead = pr.leadTimeSeconds;
    if (!lead || lead <= 0) continue;

    const commits = pr.commitsCount ?? 0;
    const reviewComments = pr.reviewCommentsCount ?? 0;

    const isLongLeadTime = lead > LONG_LEAD_TIME_SECONDS;
    const isLowActivity =
      commits < LOW_COMMITS_THRESHOLD &&
      reviewComments < LOW_REVIEW_COMMENTS_THRESHOLD;

    if (!isLongLeadTime || !isLowActivity) continue;

    const days = Math.round((lead / (24 * 3600)) * 10) / 10;

    signals.push({
      id: `long_idle_gap:${pr.id}`,
      kind: 'long_idle_gap',
      severity: lead >= LONG_LEAD_TIME_SECONDS * 2 ? 'attention' : 'info',
      text: `PR #${pr.prNumber} stayed open ${days} days with minimal activity.`,
      relatedItem: getPrRelatedItem(pr),
      occurredAt: pr.createdAt?.toISOString(),
      evidence: [
        { label: 'Lead time', value: days, unit: 'days' },
        { label: 'Commits', value: commits },
        { label: 'Review comments', value: reviewComments },
      ],
    });
  }

  return signals;
}
