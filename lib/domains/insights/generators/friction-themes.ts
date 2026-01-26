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
import { Insight, InsightRelatedItem } from '@/types/api/insights';
import { scoreInsightBase } from '../scoring';
import { formatRangeServer } from '@/lib/utils/server-date';

type TagStats = {
  tag: ReviewTag;
  label: string;
  count: number;
  share: number;
  medianApprovalHours: number | null;
  approvalDeltaHours: number | null;
};

type FrictionItem = {
  pr: PullRequest;
  frictionTags: string[];
  approvalTime: number | null;
};

// Thresholds
const THRESHOLD_MINIMUM_BLOCKED_PRS = 3;
const THRESHOLD_MIN_SHARE_WITH_TAG = 0.25; // at least 25% of blocked PRs have that tag
const THRESHOLD_MIN_COUNT_WITH_TAG = 3;
const THRESHOLD_HAS_DELAY_SIGNAL = 1; // 1 hour approval difference

export function generateFrictionThemesInsight(
  ctx: InsightContext
): Insight | null {
  const { authoredPrs, prSummariesByPrId } = ctx;

  if (!authoredPrs || authoredPrs.length === 0) return null;

  // Baseline time to approval from all PRs
  const baselineApprovalTimes = authoredPrs
    .map((pr) =>
      pr.timeToFirstApprovalSeconds
        ? pr.timeToFirstApprovalSeconds / 3600
        : null
    )
    .filter((s) => !!s && s > 0) as number[];

  const baselineApprovalHours =
    baselineApprovalTimes.length > 0
      ? computeMedianClamped(baselineApprovalTimes, {
          min: 0,
          max: MAX_HOURS_CUTOFF,
        })
      : null;

  const frictionItems: FrictionItem[] = authoredPrs
    .map((pr: PullRequest) => {
      const summary = prSummariesByPrId?.get(pr.id);
      const frictionTags: string[] = summary?.reviewFrictionTags ?? [];

      const changesRequestedEquivalent =
        pr.blockingReviewCount ?? pr.changesRequestedCount ?? 0;

      if (!frictionTags || frictionTags.length === 0) return null;
      if (changesRequestedEquivalent <= 0) return null;

      return {
        pr,
        frictionTags: Array.from(
          new Set(
            frictionTags.filter((t): t is ReviewTag =>
              (REVIEW_TAG_VOCAB as readonly string[]).includes(t)
            )
          )
        ),
        approvalTime: pr.timeToFirstApprovalSeconds
          ? pr.timeToFirstApprovalSeconds / 3600
          : null,
      };
    })
    .filter(Boolean) as FrictionItem[];

  if (frictionItems.length < THRESHOLD_MINIMUM_BLOCKED_PRS) {
    return null;
  }

  const totalFrictionPrs = frictionItems.length;

  const tagStats: TagStats[] = [];
  for (const tag of REVIEW_TAG_VOCAB) {
    const withTag = frictionItems.filter((f) => f.frictionTags.includes(tag));
    if (withTag.length === 0) continue;

    const approvalTimesWithTag = withTag
      .map((f) => f.approvalTime)
      .filter((hrs) => !!hrs && hrs > 0) as number[];

    let medianApprovalHours: number | null = null;
    let approvalDeltaHours: number | null = null;

    if (baselineApprovalHours !== null && approvalTimesWithTag.length >= 2) {
      medianApprovalHours = computeMedianClamped(approvalTimesWithTag, {
        min: 0,
        max: MAX_HOURS_CUTOFF,
      });
      approvalDeltaHours = medianApprovalHours - baselineApprovalHours;
    }

    const count = withTag.length;
    const share = count / totalFrictionPrs;

    tagStats.push({
      tag,
      label: REVIEW_TAG_LABELS[tag],
      count,
      share,
      medianApprovalHours,
      approvalDeltaHours,
    });
  }

  if (tagStats.length === 0) return null;

  const viable = tagStats.filter(
    (t) =>
      t.count >= THRESHOLD_MIN_COUNT_WITH_TAG &&
      t.share >= THRESHOLD_MIN_SHARE_WITH_TAG
  );
  if (viable.length === 0) return null;

  viable.sort((a, b) => {
    if (b.share !== a.share) return b.share - a.share;
    const aDelta = a.approvalDeltaHours ?? 0;
    const bDelta = b.approvalDeltaHours ?? 0;
    return bDelta - aDelta;
  });

  const top = viable[0];

  const baselineLabel =
    baselineApprovalHours !== null
      ? `${baselineApprovalHours.toFixed(1)}h`
      : '—';

  const hasDelaySignal =
    baselineApprovalHours !== null &&
    top.medianApprovalHours !== null &&
    (top.approvalDeltaHours ?? 0) > THRESHOLD_HAS_DELAY_SIGNAL;

  const medianWithTagLabel =
    top.medianApprovalHours !== null
      ? `${top.medianApprovalHours.toFixed(1)}h`
      : '—';

  const pct = Math.round(top.share * 100);
  const latencyDelta = top.approvalDeltaHours ?? 0;

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

  if (hasDelaySignal && top.medianApprovalHours) {
    title = `${top.label} is your biggest source of review friction`;
    emphasis = `${pct}% of blocked PRs hit ${top.label}`;

    const delta = top.approvalDeltaHours!;
    const deltaLabel = delta.toFixed(1);

    body =
      `In the selected period, ${top.label} showed up in about ${pct}% of your PRs that didn’t pass on the first review. ` +
      `Those PRs took around ${medianWithTagLabel} to get past the first blocking review, compared to ${baselineLabel} for your other blocked PRs (about +${deltaLabel} hours). ` +
      (descHint ? `${descHint} ` : '') +
      `When you expect ${top.label.toLowerCase()} to be a sticking point, it’s worth front-loading fixes before asking for review.`;
  } else {
    title = `${top.label} is the most common reason reviews block your PRs`;
    emphasis = `${pct}% of blocked PRs cite ${top.label}`;

    body =
      `Over the selected period, ${top.label} appeared in about ${pct}% of your PRs that didn’t pass on the first review. ` +
      (descHint
        ? `${descHint} `
        : 'Reviewers are consistently asking for similar improvements when this comes up. ') +
      `Even small improvements in this area can reduce how often reviews stall your PRs.`;
  }

  const stats: InsightDraft['stats'] = [
    {
      label: 'Blocked PRs',
      value: String(totalFrictionPrs),
      importance: 'primary',
    },
    {
      label: 'PRs with this theme',
      value: `${top.count} (${pct}%)`,
      importance: 'primary',
    },
  ];

  if (hasDelaySignal && top.approvalDeltaHours !== null) {
    stats.push({
      label: 'Extra time to approval',
      value: `+${top.approvalDeltaHours.toFixed(1)}h`,
      importance: 'primary',
    });
  }

  const relatedItems: InsightRelatedItem[] = frictionItems
    .slice()
    .filter((f) => f.frictionTags.includes(top.tag))
    .sort((a, b) => {
      const aTime = a.approvalTime ?? 0;
      const bTime = b.approvalTime ?? 0;
      return bTime - aTime;
    })
    .slice(0, 10)
    .map((f) => {
      const approvalHours = f.approvalTime ?? null;
      const pr = f.pr;
      return {
        entityType: 'pull_request' as const,
        id: pr.id,
        title: pr.title || `PR #${pr.prNumber}`,
        stats: [
          approvalHours !== null
            ? {
                label: 'Time to first approval',
                value: `${approvalHours.toFixed(1)}h`,
              }
            : {
                label: 'Time to first approval',
                value: 'n/a',
              },
          {
            label: 'Review rounds',
            value: (pr.reviewRounds ?? 1).toString(),
          },
        ],
        meta: {
          prNumber: pr.prNumber,
          repoFullName: pr.repoFullName,
          htmlUrl: pr.htmlUrl,
          approvalHours,
          frictionTags: f.frictionTags,
        },
      };
    });

  const insight: Insight = {
    id: `friction-themes:${top.tag}`,
    kind: 'friction_themes',
    severity: 'warning',
    title,
    emphasis,
    body,
    timeWindowLabel: formatRangeServer(
      ctx.windowStart,
      ctx.windowEnd,
      ctx.timezone
    ),
    stats,
    score,
    relatedItems,
    transparency: {
      summary: hasDelaySignal
        ? `"${top.label}" shows up frequently on blocked PRs and is measurably slower to get approved than your typical blocked PR.`
        : `"${top.label}" shows up frequently on blocked PRs in this window, so it’s a meaningful pattern even if the delay is close to baseline.`,
      bullets: [
        `Blocked PRs in this window: ${totalFrictionPrs}`,
        `This theme appears on ${pct}% of blocked PRs (${top.count} of ${totalFrictionPrs}).`,
        baselineApprovalHours !== null
          ? `Baseline time to first approval on your merged PRs: ${baselineApprovalHours.toFixed(
              1
            )}h.`
          : `Baseline time to first approval on your merged PRs was not available.`,
        top.medianApprovalHours !== null
          ? `When this theme appears, median time to first approval is ${top.medianApprovalHours.toFixed(
              1
            )}h (${latencyDelta >= 0 ? '+' : ''}${latencyDelta.toFixed(
              1
            )}h vs baseline for blocked PRs).`
          : `We didn't have enough timing data to compare approval speed for this theme.`,
      ],
      thresholds: [
        {
          key: 'minBlockedPrs',
          label: 'Minimum blocked PRs to consider a theme',
          actual: totalFrictionPrs,
          condition: `>= ${THRESHOLD_MINIMUM_BLOCKED_PRS}`,
        },
        {
          key: 'minShareWithTag',
          label: 'Share of blocked PRs with this theme',
          actual: top.share, // 0–1
          condition: `>= ${THRESHOLD_MIN_SHARE_WITH_TAG} (~${Math.round(
            THRESHOLD_MIN_SHARE_WITH_TAG * 100
          )}%)`,
        },
        {
          key: 'minCountWithTag',
          label: 'Number of blocked PRs with this theme',
          actual: top.count,
          condition: `>= ${THRESHOLD_MIN_COUNT_WITH_TAG}`,
        },
        ...(hasDelaySignal && top.approvalDeltaHours !== null
          ? [
              {
                key: 'minDelaySignalHours',
                label: 'Extra time to approval when this theme appears (hours)',
                actual: top.approvalDeltaHours,
                condition: `>= ${THRESHOLD_HAS_DELAY_SIGNAL}h`,
              },
            ]
          : []),
      ],
    },
  };

  return insight;
}
