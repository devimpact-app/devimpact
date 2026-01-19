import { Signal } from '@/types/api/signals';
import { SignalContext } from '../types';
import { getPrRelatedItem } from '../helpers';

const LARGE_LINES_THRESHOLD = 800;
const LARGE_FILES_THRESHOLD = 25;
const VERY_LARGE_LINES_THRESHOLD = 1500;

export function generateLargeChangeSignals(ctx: SignalContext): Signal[] {
  const signals: Signal[] = [];

  for (const pr of ctx.authoredPrs) {
    const lines = pr.linesChanged ?? 0;
    const files = pr.filesChanged ?? 0;

    const isLargeSurfaceArea =
      lines >= VERY_LARGE_LINES_THRESHOLD ||
      (lines >= LARGE_LINES_THRESHOLD && files >= LARGE_FILES_THRESHOLD);

    if (!isLargeSurfaceArea) continue;

    const severity =
      lines >= VERY_LARGE_LINES_THRESHOLD || files >= LARGE_FILES_THRESHOLD * 2
        ? 'attention'
        : 'info';

    signals.push({
      id: `large_change:${pr.id}`,
      kind: 'large_change',
      severity,
      text: `PR #${pr.prNumber} was a large change (${lines} lines across ${files} files).`,
      relatedItem: getPrRelatedItem(pr),
      occurredAt: pr.createdAt?.toISOString(),
      evidence: [
        { label: 'Lines changed', value: lines, unit: 'lines' },
        { label: 'Files changed', value: files, unit: 'files' },
      ],
    });
  }

  return signals;
}
