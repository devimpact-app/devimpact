import { Signal } from '@/types/api/signals';
import { SignalContext } from '../types';
import { getPrRelatedItem } from '../helpers';

const SLOW_FIRST_REVIEW_THRESHOLD_HOURS = 18;

export function generateSlowFirstReviewSignals(ctx: SignalContext): Signal[] {
  const signals: Signal[] = [];

  for (const pr of ctx.authoredPrs) {
    const seconds = pr.timeToFirstReviewSeconds;
    console.log('seconds', seconds);
    if (!seconds) continue;

    const hours = seconds / 3600;
    if (hours <= SLOW_FIRST_REVIEW_THRESHOLD_HOURS) continue;

    const rounded = Math.round(hours * 10) / 10;

    signals.push({
      id: `slow_first_review:${pr.id}`,
      kind: 'slow_first_review',
      severity: hours >= 36 ? 'attention' : 'info',
      text: `PR #${pr.prNumber} waited ${rounded} hours for its first review.`,
      relatedItem: getPrRelatedItem(pr),
      occurredAt: pr.createdAt?.toISOString(),
      evidence: [
        {
          label: 'Time to first review',
          value: rounded,
          unit: 'hours',
        },
      ],
    });
  }

  return signals;
}
