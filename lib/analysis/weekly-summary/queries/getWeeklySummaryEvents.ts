import { db } from '@/lib/db/client';
import {
  ActivityEvent,
  activityEvents,
  threadEvents,
} from '@/lib/db/schema/activity';
import { and, asc, eq, gte, inArray, lt } from 'drizzle-orm';
import { WeeklySummaryEventPreview } from '../llm/types';
import { evaluateThreadCandidate } from '../../threads/policy/threadCandidatePolicy';

export const UNTHREADED_KEY = 'unthreaded';

function inferKindFromRow(row: {
  sourceEntityTable: string;
  metadata: any | null;
}): WeeklySummaryEventPreview['kind'] | null {
  const k = row.metadata?.kind;
  if (k === 'pr' || k === 'review' || k === 'meeting' || k === 'ooo') return k;
  if (row.sourceEntityTable === 'pull_requests') return 'pr';
  if (row.sourceEntityTable === 'reviews') return 'review';
  if (row.sourceEntityTable === 'calendar_events') return 'meeting';
  return null;
}

function buildMetadataHint(
  kind: WeeklySummaryEventPreview['kind'],
  metadata: any | null
): WeeklySummaryEventPreview['metadataHint'] | undefined {
  if (!metadata) return undefined;
  if (kind === 'pr') {
    return {
      pr: {
        linesChanged: metadata.size?.linesChanged,
        filesChanged: metadata.size?.filesChanged,
        touchedTests: metadata.shape?.touchedTests,
      },
    };
  }
  if (kind === 'review') {
    return {
      review: {
        decision: metadata.decision,
        commentsCount: metadata.depth?.commentsCount,
        wasDirectlyRequested: metadata.role?.wasDirectlyRequested,
        isBlocking: metadata.role?.isBlocking,
      },
    };
  }
  if (kind === 'meeting') {
    return {
      meeting: {
        durationMinutes: metadata.structure?.durationMinutes,
        isRecurring: metadata.structure?.isRecurring,
        category: metadata.classification?.category,
        subtype: metadata.classification?.categorySubtype,
      },
    };
  }
  if (kind === 'ooo') {
    return {
      ooo: {
        isAllDay: metadata.isAllDay,
        durationMinutes: metadata.durationMinutes,
      },
    };
  }

  return undefined;
}

function toWeeklyPreview(row: {
  id: string;
  occurredAt: Date;
  endAt: Date | null;
  title: string;
  subtitle: string | null;
  url: string | null;
  repoFullName: string | null;
  prNumber: number | null;
  sourceEntityTable: string;
  metadata: any | null;
}): WeeklySummaryEventPreview | null {
  const kind = inferKindFromRow(row);
  if (!kind) return null;

  return {
    id: row.id,
    kind,
    occurredAt: row.occurredAt.toISOString(),
    endAt: row.endAt ? row.endAt.toISOString() : null,
    title: row.title,
    subtitle: row.subtitle ?? null,
    url: row.url ?? null,
    repoFullName: row.repoFullName ?? null,
    prNumber: row.prNumber ?? null,
    metadataHint: buildMetadataHint(kind, row.metadata),
  };
}

export async function getWeeklySummaryEvents({
  tenantId,
  weekStartUtc,
  weekEndUtc,
  limit = 250,
}: {
  tenantId: string;
  weekStartUtc: Date;
  weekEndUtc: Date;
  limit?: number;
}): Promise<{
  allEventIds: string[];
  countsByKind: { pr: number; review: number; meeting: number; ooo: number };
  threadEventMap: Record<string, WeeklySummaryEventPreview[]>;
}> {
  const rows = await db
    .select({
      threadId: threadEvents.threadId,
      id: activityEvents.id,
      occurredAt: activityEvents.occurredAt,
      eventType: activityEvents.eventType,
      endAt: activityEvents.endAt,
      title: activityEvents.title,
      subtitle: activityEvents.subtitle,
      url: activityEvents.url,
      repoFullName: activityEvents.repoFullName,
      prNumber: activityEvents.prNumber,
      sourceEntityTable: activityEvents.sourceEntityTable,
      metadata: activityEvents.metadata,
    })
    .from(activityEvents)
    .leftJoin(
      threadEvents,
      and(
        eq(threadEvents.tenantId, activityEvents.tenantId),
        eq(threadEvents.activityEventId, activityEvents.id)
      )
    )
    .where(
      and(
        eq(activityEvents.tenantId, tenantId),
        gte(activityEvents.occurredAt, weekStartUtc),
        lt(activityEvents.occurredAt, weekEndUtc)
      )
    )
    .orderBy(asc(activityEvents.occurredAt), asc(activityEvents.id))
    .limit(limit);

  const threadEventMap: Record<string, WeeklySummaryEventPreview[]> = {};
  for (const r of rows) {
    const { threadId, ...rest } = r;
    const key = threadId ?? UNTHREADED_KEY;
    const bucket = (threadEventMap[key] ??= []);
    // Filter out non-eligible unthreaded events
    if (!threadId) {
      const { eligible } = evaluateThreadCandidate(rest as ActivityEvent);
      if (!eligible) continue;
    }
    // Add to bucket
    if (bucket.length >= limit) continue;
    const eventPreview = toWeeklyPreview(r);
    if (eventPreview) {
      bucket.push(eventPreview);
    }
  }
  let countsByKind: {
    pr: number;
    review: number;
    meeting: number;
    ooo: number;
  } = {
    pr: 0,
    review: 0,
    meeting: 0,
    ooo: 0,
  };
  rows.map((r) => {
    const kind = inferKindFromRow(r);
    if (kind === 'pr') {
      countsByKind.pr++;
    } else if (kind === 'review') {
      countsByKind.review++;
    } else if (kind === 'meeting') {
      countsByKind.meeting++;
    } else if (kind === 'ooo') {
      countsByKind.ooo++;
    }
  });
  return {
    threadEventMap,
    allEventIds: rows.map((r) => r.id),
    countsByKind,
  };
}
