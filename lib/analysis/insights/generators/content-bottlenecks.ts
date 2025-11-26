import { InsightContext, InsightDraft } from '../types';
import { diffSecondsRounded } from '../../normalizers/helpers';
import { computeMedianClamped } from '@/lib/utils/math';
import {
  formatSizeLabel,
  getSizeBucket,
  MAX_HOURS_CUTOFF,
  SizeBucket,
} from './shared';

type ContentBottleneckCandidate = {
  prId: string;
  title: string;
  htmlUrl?: string | null;

  cycleTimeHours: number;
  sizeBucket: SizeBucket;
  linesChanged: number;
  filesChanged: number;

  tags: string[];
};

type BucketStats = {
  bucket: SizeBucket;
  totalCount: number;
  slowCount: number;
  slowMedianHours: number;
  overallShare: number;
  slowShare: number;
};

function pickTopTagForSlowBucket(
  slowInBucket: ContentBottleneckCandidate[]
): { tag: string; share: number; count: number } | null {
  const counts = new Map<string, number>();

  for (const c of slowInBucket) {
    for (const tag of c.tags ?? []) {
      const normalized = tag.toLowerCase().trim();
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return null;

  const totalTagged = Array.from(counts.values()).reduce(
    (sum, c) => sum + c,
    0
  );
  if (totalTagged === 0) return null;

  const entries = Array.from(counts.entries()).map(([tag, count]) => ({
    tag,
    count,
    share: count / totalTagged,
  }));

  // Sort by count/importance
  entries.sort((a, b) => b.count - a.count);

  const top = entries[0];
  // require at least a modest signal
  if (top.count < 3) return null;
  if (top.share < 0.3) return null; // at least ~30% of tagged slow PRs

  return top;
}

export function generateContentBottlenecksInsight(
  ctx: InsightContext
): InsightDraft | null {
  const { authoredPrs, prSummariesByPrId } = ctx;

  // 1) Build candidates with cycle time + scope + tags
  const candidates: ContentBottleneckCandidate[] = authoredPrs
    .filter((pr) => pr.lastReadyForReviewAt && pr.mergedAt)
    .map((pr) => {
      const cycleSeconds = diffSecondsRounded(
        pr.lastReadyForReviewAt!,
        pr.mergedAt!
      );
      const safeSeconds =
        typeof cycleSeconds === 'number' && cycleSeconds > 0 ? cycleSeconds : 0;
      const cycleTimeHours = safeSeconds / 3600;

      const linesChanged = pr.linesChanged ?? 0;
      const filesChanged = pr.filesChanged ?? 0;
      const sizeBucket = getSizeBucket(linesChanged, filesChanged);
      console.log('pr', linesChanged, filesChanged, sizeBucket);

      const summary = prSummariesByPrId.get(pr.id);
      const tags = (summary?.typeTags as string[] | undefined) ?? [];

      return {
        prId: pr.id,
        title: pr.title,
        htmlUrl: pr.htmlUrl,
        cycleTimeHours,
        sizeBucket,
        linesChanged,
        filesChanged,
        tags,
      };
    })
    .filter((c) => c.cycleTimeHours > 0 && c.cycleTimeHours < MAX_HOURS_CUTOFF);

  if (candidates.length < 6) {
    return null;
  }

  // 2) Baseline median cycle time
  const baselineMedianHours = computeMedianClamped(
    candidates.map((c) => c.cycleTimeHours),
    { min: 0, max: MAX_HOURS_CUTOFF }
  );

  if (baselineMedianHours <= 0) return null;

  // 3) Define "slow" PRs
  const slowThreshold = Math.max(
    baselineMedianHours * 1.5,
    baselineMedianHours + 4
  );
  console.log('content baselineMedianHours', baselineMedianHours);
  console.log('content slowThreshold', slowThreshold);
  const slow = candidates.filter((c) => c.cycleTimeHours >= slowThreshold);

  console.log('content slow', slow.length);
  if (slow.length < 3) {
    return null;
  }

  // 4) Over-representation by size bucket
  const allCount = candidates.length;
  const slowCount = slow.length;

  const buckets: SizeBucket[] = ['tiny', 'small', 'medium', 'large'];

  const stats: BucketStats[] = buckets.map((bucket) => {
    const allInBucket = candidates.filter((c) => c.sizeBucket === bucket);
    const slowInBucket = slow.filter((c) => c.sizeBucket === bucket);

    const slowMedianHours = slowInBucket.length
      ? computeMedianClamped(
          slowInBucket.map((c) => c.cycleTimeHours),
          { min: 0, max: MAX_HOURS_CUTOFF }
        )
      : 0;

    return {
      bucket,
      totalCount: allInBucket.length,
      slowCount: slowInBucket.length,
      slowMedianHours,
      overallShare: allInBucket.length / allCount,
      slowShare: slowInBucket.length / slowCount,
    };
  });

  console.log('stats', stats);

  const viable = stats
    .filter((s) => s.slowCount >= 3 && s.totalCount >= 3)
    .filter((s) => s.slowMedianHours > baselineMedianHours)
    .filter((s) => s.slowShare >= s.overallShare + 0.15);

  if (viable.length === 0) return null;

  viable.sort((a, b) => {
    const aOver = a.slowShare - a.overallShare;
    const bOver = b.slowShare - b.overallShare;
    if (bOver !== aOver) return bOver - aOver;

    const aDelta = a.slowMedianHours - baselineMedianHours;
    const bDelta = b.slowMedianHours - baselineMedianHours;
    if (bDelta !== aDelta) return bDelta - aDelta;

    return b.slowCount - a.slowCount;
  });

  const best = viable[0];
  const sizeLabel = formatSizeLabel(best.bucket);
  const slowInBestBucket = slow.filter((c) => c.sizeBucket === best.bucket);

  const slowdownPct =
    best.slowMedianHours > 0
      ? Math.round(
          ((best.slowMedianHours - baselineMedianHours) / baselineMedianHours) *
            100
        )
      : 0;

  const topTag = pickTopTagForSlowBucket(slowInBestBucket);

  const title = `${sizeLabel} are where your PRs tend to stall`;
  const emphasis = `${slowdownPct}% slower than your typical PR`;
  const timeWindowLabel = 'Last 4 weeks';

  const firstSentence = `${sizeLabel
    .charAt(0)
    .toUpperCase()}${sizeLabel.slice(1)} made up ${Math.round(
    best.slowShare * 100
  )}% of your slowest PRs, even though they’re only about ${Math.round(
    best.overallShare * 100
  )}% of what you ship.`;

  const secondSentence = `On median they took about ${best.slowMedianHours.toFixed(
    1
  )} hours from ready-for-review to merge, versus ${baselineMedianHours.toFixed(
    1
  )} hours overall (${slowdownPct}% slower).`;

  let tagSentence = '';
  if (topTag) {
    const tagLabel = topTag.tag;
    tagSentence = ` A lot of these slow PRs are tagged as “${tagLabel}”, which might be where alignment or earlier design review would pay off the most.`;
  }

  const thirdSentence =
    tagSentence ||
    ' When a change starts to get this large, it’s worth asking if it can be split earlier or staged behind feature flags.';

  const body = `${firstSentence} ${secondSentence}${thirdSentence}`;

  const insight: InsightDraft = {
    id: `content-bottlenecks:${best.bucket}`,
    kind: 'bottlenecks',
    severity: 'warning',
    title,
    emphasis,
    body,
    timeWindowLabel,
    stats: [
      {
        label: 'Slow PRs in this bucket',
        value: String(best.slowCount),
      },
      {
        label: 'Bucket median cycle',
        value: `${best.slowMedianHours.toFixed(1)}h`,
      },
      {
        label: 'Overall median cycle',
        value: `${baselineMedianHours.toFixed(1)}h`,
      },
      ...(topTag
        ? [
            {
              label: 'Most common tag in slow PRs',
              value: `${topTag.tag} (${Math.round(topTag.share * 100)}%)`,
            },
          ]
        : []),
    ],
    metrics: {
      baselineMedianHours,
      slowMedianHours: best.slowMedianHours,
      slowCount: best.slowCount,
      totalPrCount: allCount,
      bucket: best.bucket,
      topTag: topTag?.tag ?? null,
    } as any,
    meta: {
      bucket: best.bucket,
      slowdownPct,
      slowShare: best.slowShare,
      overallShare: best.overallShare,
      topTag,
    },
  };

  return insight;
}
