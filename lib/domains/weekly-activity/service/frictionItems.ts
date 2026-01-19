import { PullRequest } from '@/lib/db/schema';
import { FrictionItem } from '@/types/api/weekly-activity';
import { serializeActivityEventFromPr } from '../../timeline/api/serializers';

const SLOW_FIRST_REVIEW_THRESHOLD_HOURS = 18;
const HIGH_DISCUSSION_COMMENTS = 8;
const HIGH_DISCUSSION_REVIEWS = 5;
const LARGE_LINES_THRESHOLD = 800; // total lines changed
const LARGE_FILES_THRESHOLD = 25; // number of files
const VERY_LARGE_LINES_THRESHOLD = 1500;
const LONG_LEAD_TIME_SECONDS = 7 * 24 * 60 * 60; // 7 days

interface Input {
  authoredPrs: PullRequest[];
}

type FrictionReason = {
  kind: FrictionItem['kind'];
  text: string;
  score: number;
};

function prRef(pr: PullRequest) {
  return serializeActivityEventFromPr(pr);
}

function pickPrimaryKind(reasons: FrictionReason[]): FrictionItem['kind'] {
  if (reasons.some((r) => r.kind === 'latency')) return 'latency';
  if (reasons.some((r) => r.kind === 'iteration')) return 'iteration';
  return 'other';
}

export function deriveFrictionFollowups(input: Input) {
  const { authoredPrs } = input;

  const byPrId = new Map<
    string,
    { pr: PullRequest; reasons: FrictionReason[] }
  >();

  for (const pr of authoredPrs) {
    const reasons: FrictionReason[] = [];

    const lines = pr.linesChanged ?? 0;
    const files = pr.filesChanged ?? 0;
    const isTiny = lines > 0 && lines < 25 && files <= 3;
    if (isTiny) {
      continue;
    }

    // Multiple iterations
    const rounds = pr.reviewRounds ?? 0;
    const isHighDiscussion =
      (pr.reviewCommentsCount ?? 0) >= HIGH_DISCUSSION_COMMENTS ||
      (pr.reviewsCount ?? 0) >= HIGH_DISCUSSION_REVIEWS;
    if (rounds > 1 && isHighDiscussion) {
      reasons.push({
        kind: 'iteration',
        score: 3,
        text: `Multiple rounds + heavy discussion`,
      });
    }

    // Long time to first review
    const ttf = pr.timeToFirstReviewSeconds;
    const slowFirstReview =
      ttf != null && ttf > SLOW_FIRST_REVIEW_THRESHOLD_HOURS * 3600;

    if (slowFirstReview) {
      reasons.push({
        kind: 'latency',
        score: 4,
        text: `Slow first review`,
      });
    }

    const isLargeSurfaceArea =
      lines >= VERY_LARGE_LINES_THRESHOLD ||
      (lines >= LARGE_LINES_THRESHOLD && files >= LARGE_FILES_THRESHOLD);

    if (isLargeSurfaceArea) {
      reasons.push({
        kind: 'other',
        score: lines >= VERY_LARGE_LINES_THRESHOLD ? 4 : 3,
        text: `Large change (many lines/files)`,
      });
    }

    // Long gaps (lead time + low activity)
    const lead = pr.leadTimeSeconds;
    const isLongLeadTime = lead != null && lead > LONG_LEAD_TIME_SECONDS;

    const lastActivityAt = (pr as any).lastActivityAt as
      | Date
      | null
      | undefined;
    const mergedAt = pr.mergedAt;

    if (mergedAt && lastActivityAt) {
      const gapHours = (mergedAt.getTime() - lastActivityAt.getTime()) / 36e5;
      const stalledAtEnd = gapHours >= 48; // tune

      if (isLongLeadTime && stalledAtEnd) {
        reasons.push({ kind: 'other', score: 3, text: `Stalled near the end` });
      }
    }

    if (!reasons.length) continue;

    byPrId.set(pr.id, { pr, reasons });
  }

  const items: FrictionItem[] = Array.from(byPrId.values())
    .map(({ pr, reasons }) => {
      reasons.sort((a, b) => b.score - a.score);
      const detail = reasons.map((r) => r.text).join(' · ');

      return {
        id: pr.id,
        kind: pickPrimaryKind(reasons) as any,
        relatedPr: prRef(pr),
        text: `${detail}.`,
      };
    })
    .sort((a, b) => {
      const aTop = byPrId.get(a.id)?.reasons?.[0]?.score ?? 0;
      const bTop = byPrId.get(b.id)?.reasons?.[0]?.score ?? 0;
      return bTop - aTop;
    });

  return { items };
}
