import { InsightContext, InsightDraft } from '../types';
import { REVIEW_TAG_VOCAB } from '@/lib/integrations/openai/prompts/prSummary';
import {
  MAX_HOURS_CUTOFF,
  REVIEW_TAG_DESCRIPTION,
  REVIEW_TAG_LABELS,
  ReviewTag,
} from './shared';
import { PullRequest } from '@/lib/db/schema';
import { computeMedianClamped } from '@/lib/utils/math';
import { Insight } from '@/types/api/insights';
import { scoreInsightBase } from '../scoring';

type TagStats = {
  tag: ReviewTag;
  label: string;
  count: number;
  share: number;
  medianDelayHours: number | null;
  delayDeltaHours: number | null;
};

export function generateFrictionThemesInsight(
  ctx: InsightContext
): Insight | null {
  const { authoredPrs, prSummariesByPrId } = ctx;

  if (!authoredPrs || authoredPrs.length === 0) return null;

  // 1) Collect PRs that actually experienced blocking friction
  const frictionItems = authoredPrs
    .map((pr: PullRequest) => {
      const summary = prSummariesByPrId?.get(pr.id);
      const frictionTags: string[] = summary?.reviewFrictionTags ?? [];

      const changesRequestedEquivalent =
        pr.blockingReviewCount ?? pr.changesRequestedCount ?? 0;

      if (!frictionTags || frictionTags.length === 0) return null;
      if (changesRequestedEquivalent <= 0) return null;

      // Use time-to-first-approval (or fallback) as our "delay" measure
      const timeToFirstApprovalSeconds = pr.timeToFirstApprovalSeconds ?? null;
      const timeToFirstReviewSeconds = pr.timeToFirstReviewSeconds ?? null;

      const delaySeconds =
        typeof timeToFirstApprovalSeconds === 'number' &&
        timeToFirstApprovalSeconds > 0
          ? timeToFirstApprovalSeconds
          : typeof timeToFirstReviewSeconds === 'number' &&
              timeToFirstReviewSeconds > 0
            ? timeToFirstReviewSeconds
            : null;

      return {
        pr,
        frictionTags: Array.from(
          new Set(
            frictionTags.filter((t): t is ReviewTag =>
              (REVIEW_TAG_VOCAB as readonly string[]).includes(t)
            )
          )
        ),
        delayHours: delaySeconds ? delaySeconds / 3600 : null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (frictionItems.length < 3) {
    // Not enough data to say anything meaningful
    return null;
  }

  const totalFrictionPrs = frictionItems.length;

  // 2) Compute baseline delay for blocked PRs (where we have delay)
  const baselineDelays = frictionItems
    .map((f) => f.delayHours)
    .filter((hrs) => !!hrs && hrs > 0) as number[];

  const baselineMedianHours =
    baselineDelays.length > 0
      ? computeMedianClamped(baselineDelays, { min: 0, max: MAX_HOURS_CUTOFF })
      : null;

  const tagStats: TagStats[] = [];
  for (const tag of REVIEW_TAG_VOCAB) {
    const withTag = frictionItems.filter((f) => f.frictionTags.includes(tag));

    if (withTag.length === 0) continue;

    const delaysWithTag = withTag
      .map((f) => f.delayHours)
      .filter((hrs) => !!hrs && hrs > 0) as number[];

    let medianDelayHours: number | null = null;
    let delayDeltaHours: number | null = null;

    if (baselineMedianHours !== null && delaysWithTag.length >= 2) {
      medianDelayHours = computeMedianClamped(delaysWithTag, {
        min: 0,
        max: MAX_HOURS_CUTOFF,
      });
      delayDeltaHours = medianDelayHours - baselineMedianHours;
    }

    const count = withTag.length;
    const share = count / totalFrictionPrs;

    tagStats.push({
      tag,
      label: REVIEW_TAG_LABELS[tag],
      count,
      share,
      medianDelayHours,
      delayDeltaHours,
    });
  }

  if (tagStats.length === 0) return null;

  const MIN_SHARE = 0.25; // at least 25% of blocked PRs
  const MIN_COUNT = 3;

  const viable = tagStats.filter(
    (t) => t.count >= MIN_COUNT && t.share >= MIN_SHARE
  );
  if (viable.length === 0) return null;

  viable.sort((a, b) => {
    if (b.share !== a.share) return b.share - a.share;
    const aDelta = a.delayDeltaHours ?? 0;
    const bDelta = b.delayDeltaHours ?? 0;
    return bDelta - aDelta;
  });

  const top = viable[0];

  const baselineLabel =
    baselineMedianHours !== null ? `${baselineMedianHours.toFixed(1)}h` : '—';

  const hasDelaySignal =
    baselineMedianHours !== null &&
    top.medianDelayHours !== null &&
    (top.delayDeltaHours ?? 0) > 1;

  const medianWithTagLabel =
    top.medianDelayHours !== null ? `${top.medianDelayHours.toFixed(1)}h` : '—';

  const pct = Math.round(top.share * 100);
  const latencyDelta = top.delayDeltaHours ?? 0;

  // Simple scoring heuristic for v0 ---
  let signalStrength = 2;
  if (hasDelaySignal) {
    if (top.share >= 0.5 && latencyDelta >= 8) {
      signalStrength = 5;
    } else if (top.share >= 0.4 && latencyDelta >= 4) {
      signalStrength = 4;
    } else if (top.share >= 0.3 && latencyDelta >= 2) {
      signalStrength = 3;
    }
  } else {
    if (top.share >= 0.4) signalStrength = 3;
    else if (top.share >= 0.3) signalStrength = 2;
  }

  // recurrence: how often this theme appears on blocked PRs
  let recurrence = 2;
  if (top.count >= 10 && top.share >= 0.4) recurrence = 5;
  else if (top.count >= 6 && top.share >= 0.3) recurrence = 4;
  else if (top.count >= 3 && top.share >= 0.25) recurrence = 3;

  // impact: extra time cost when this theme appears
  let impact = 2;
  if (latencyDelta >= 8) impact = 5;
  else if (latencyDelta >= 4) impact = 4;
  else if (latencyDelta >= 2) impact = 3;

  const novelty = 3; // “this specific friction theme” is moderately novel
  const personalization = 4; // tuned to *your* review history

  const score = scoreInsightBase({
    signalStrength,
    recurrence,
    impact,
    novelty,
    personalization,
  });

  const descHint = REVIEW_TAG_DESCRIPTION[top.tag];
  let title: string;
  let emphasis: string;
  let body: string;

  if (hasDelaySignal && baselineMedianHours !== null && top.medianDelayHours) {
    title = `${top.label} is your biggest source of review friction`;
    emphasis = `${pct}% of blocked PRs hit ${top.label}`;

    const delta = top.delayDeltaHours!;
    const deltaLabel = delta.toFixed(1);

    body =
      `In the last 4 weeks, ${top.label} showed up in about ${pct}% of your PRs that didn’t pass on the first review. ` +
      `Those PRs took around ${medianWithTagLabel} to get past the first blocking review, compared to ${baselineLabel} for your other blocked PRs (about +${deltaLabel} hours). ` +
      (descHint ? `${descHint} ` : '') +
      `When you expect ${top.label.toLowerCase()} to be a sticking point, it’s worth front-loading fixes before asking for review.`;
  } else {
    title = `${top.label} is the most common reason reviews block your PRs`;
    emphasis = `${pct}% of blocked PRs cite ${top.label}`;

    body =
      `Over the last 4 weeks, ${top.label} appeared in about ${pct}% of your PRs that didn’t pass on the first review. ` +
      (descHint
        ? `${descHint} `
        : 'Reviewers are consistently asking for similar improvements when this comes up. ') +
      `Even small improvements in this area can reduce how often reviews stall your PRs.`;
  }

  const stats: InsightDraft['stats'] = [
    {
      label: 'Blocked PRs',
      value: String(totalFrictionPrs),
    },
    {
      label: 'PRs with this theme',
      value: `${top.count} (${pct}%)`,
    },
  ];

  if (hasDelaySignal && top.delayDeltaHours !== null) {
    stats.push({
      label: 'Extra time to approval',
      value: `+${top.delayDeltaHours.toFixed(1)}h`,
    });
  }

  const insight: Insight = {
    id: `friction-themes:${top.tag}`,
    kind: 'friction_themes',
    severity: 'warning',
    title,
    emphasis,
    body,
    timeWindowLabel: 'Last 4 weeks',
    stats,
    metrics: {
      totalFrictionPrs,
      topTag: top.tag,
      topTagCount: top.count,
      topTagShare: top.share,
      baselineMedianHours,
      tagMedianDelayHours: top.medianDelayHours,
      tagDelayDeltaHours: top.delayDeltaHours,
    },
    meta: {
      topTagLabel: top.label,
      hasDelaySignal,
    },
    score,
  };

  return insight;
}
