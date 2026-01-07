import { PrSummary } from '@/lib/db/schema';
import { ActivityEvent } from '@/lib/db/schema/activity';
import { ThreadCandidateEvent } from './types';

type SummaryPick = Pick<
  PrSummary,
  'prId' | 'shortSummary' | 'highlights' | 'typeTags' | 'domainTags'
>;

function sizeBucket(
  linesChanged: number,
  filesChanged: number
): 'small' | 'medium' | 'large' {
  if (linesChanged >= 600 || filesChanged >= 30) return 'large';
  if (linesChanged >= 200 || filesChanged >= 12) return 'medium';
  return 'small';
}

function reviewSizeBucket(commentsCount: number): 'small' | 'medium' | 'large' {
  if (commentsCount >= 10) return 'large';
  if (commentsCount >= 3) return 'medium';
  return 'small';
}

function meetingSizeBucket(
  durationMinutes: number
): 'small' | 'medium' | 'large' {
  if (durationMinutes >= 60) return 'large';
  if (durationMinutes >= 30) return 'medium';
  return 'small';
}

function normalizeLabel(v?: string | null): string | null {
  const s = (v ?? '').trim();
  return s ? s.toLowerCase() : null;
}

export function shapeEventForLLM(
  e: ActivityEvent,
  prSummariesByPrId: Record<string, SummaryPick>
): ThreadCandidateEvent | null {
  if (!e.occurredAt) return null;

  // PR
  if (e.eventType === 'pr_merged') {
    const m = e.metadata?.kind === 'pr' ? e.metadata : null;
    const prId = e.sourceEntityId;

    // Skip if no pr summary
    const s = prSummariesByPrId[prId];
    if (!s) return null;

    return {
      id: e.id,
      kind: 'pr',
      occurredAt: e.occurredAt.toISOString(),
      title: e.title,
      subtitle: e.subtitle ?? undefined,
      repo: e.repoFullName ?? undefined,
      prNumber: e.prNumber ?? undefined,
      summary: {
        short: s.shortSummary,
        highlights: s.highlights,
        typeTags: s.typeTags,
        domainTags: s.domainTags,
      },
      signals: {
        role: 'owner',
        outcome: 'merged',
        size: m
          ? sizeBucket(m.size.linesChanged, m.size.filesChanged)
          : undefined,
      },
    };
  }

  // Review
  if (e.eventType === 'review_submitted') {
    const m = e.metadata?.kind === 'review' ? e.metadata : null;
    if (!m) return null;

    return {
      id: e.id,
      kind: 'review',
      occurredAt: e.occurredAt.toISOString(),
      title: e.title,
      subtitle: e.subtitle ?? undefined,
      repo: e.repoFullName ?? undefined,
      prNumber: e.prNumber ?? undefined,
      signals: {
        role: 'reviewer',
        outcome: m.decision, // approved | changes_requested | commented
        size: reviewSizeBucket(m.depth?.commentsCount ?? 0),
      },
    };
  }

  // Meeting
  if (e.eventType === 'meeting_attended') {
    const m = e.metadata?.kind === 'meeting' ? e.metadata : null;
    if (!m) return null;

    const cat = normalizeLabel(m.classification?.category);
    const subtype = normalizeLabel(m.classification?.categorySubtype);

    return {
      id: e.id,
      kind: 'meeting',
      occurredAt: e.occurredAt.toISOString(),
      title: e.title,
      subtitle: e.subtitle ?? undefined,
      signals: {
        role: 'participant',
        meetingCategory: cat ?? undefined,
        meetingSubtype: subtype ?? undefined,
        isRecurring: m.structure?.isRecurring ?? undefined,
        durationMinutes: m.structure?.durationMinutes ?? undefined,
        organizerSelf: m.participation?.isOrganizerSelf ?? undefined,
        size: meetingSizeBucket(m.structure?.durationMinutes ?? 0),
      },
    };
  }

  return null;
}
