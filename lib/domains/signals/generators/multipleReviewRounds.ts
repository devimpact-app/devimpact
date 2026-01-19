import { Signal } from '@/types/api/signals';
import { SignalContext } from '../types';
import { getPrRelatedItem } from '../helpers';

const MULTIPLE_REVIEW_ROUNDS_THRESHOLD = 3;

export function generateMultipleReviewRoundsSignals(
  ctx: SignalContext
): Signal[] {
  const signals: Signal[] = [];

  for (const pr of ctx.authoredPrs) {
    const rounds = pr.reviewRounds ?? 0;
    if (rounds < MULTIPLE_REVIEW_ROUNDS_THRESHOLD) continue;

    signals.push({
      id: `multiple_review_rounds:${pr.id}`,
      kind: 'multiple_review_rounds',
      severity: rounds >= 3 ? 'attention' : 'info',
      text: `PR #${pr.prNumber} went through ${rounds} review rounds.`,
      relatedItem: getPrRelatedItem(pr),
      occurredAt: pr.createdAt?.toISOString(),
      evidence: [
        {
          label: 'Review rounds',
          value: rounds,
        },
      ],
    });
  }

  return signals;
}
