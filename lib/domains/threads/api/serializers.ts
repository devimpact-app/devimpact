import {
  ActivityEventListItem,
  ThreadEventListItem,
  ThreadListItem,
} from '@/types/api/threads';
import { ThreadListDbRow } from '../db/read/listThreads';
import { ThreadSummaryBullet } from '@/lib/db/schema/activity';
import { isBulletEditable } from '../helpers';
import { ThreadEventDbRow } from '../db/read/listThreadEvents';
import { ActivityEventDbRow } from '../db/read/listEventsById';

export type LastEventByThreadId = Record<
  string,
  ThreadListItem['lastEvent'] | null | undefined
>;

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function normalizeLastUpdate(
  lastUpdate: ThreadListDbRow['lastUpdate']
): ThreadListItem['lastUpdate'] {
  if (!lastUpdate) return null;
  const generatedAtIso = new Date(lastUpdate.generatedAt).toISOString();

  return {
    ...lastUpdate,
    generatedAt: generatedAtIso,
  };
}

export function serializeThreadListItem(params: {
  row: ThreadListDbRow;
  lastEvent: ThreadListItem['lastEvent'] | null;
}): ThreadListItem {
  const { row, lastEvent } = params;

  return {
    id: row.id,
    categoryKey: row.categoryKey,
    title: row.title,
    titleUserEditedAt: iso(row.titleUserEditedAt),
    summaryHeadline: row.summaryHeadline ?? '',
    headlineUserEditedAt: iso(row.headlineUserEditedAt),
    status: row.status,
    confidence: row.confidence ?? null,
    firstActivityAt: iso(row.firstActivityAt),
    lastActivityAt: iso(row.lastActivityAt),
    userEditedAt: iso(row.userEditedAt),
    lastUpdate: normalizeLastUpdate(row.lastUpdate),
    eventCountTotal: Number(row.eventCountTotal ?? 0),
    eventCountsByKind: {
      pr: Number(row.prCount ?? 0),
      review: Number(row.reviewCount ?? 0),
      meeting: Number(row.meetingCount ?? 0),
      ooo: Number(row.oooCount ?? 0),
    },
    lastEvent,
  };
}

export function serializeThreadBullet(r: ThreadSummaryBullet) {
  return {
    id: r.id,
    sortIndex: r.sortIndex,
    text: r.text,
    referencedEventIds: r.referencedEventIds ?? [],
    source: r.source,
    editable: isBulletEditable({
      source: r.source,
      userEditedAt: r.userEditedAt ?? null,
      deletedAt: null,
    }),
    generatedAt: r.generatedAt ? r.generatedAt.toISOString() : null,
    userEditedAt: r.userEditedAt ? r.userEditedAt.toISOString() : null,
  };
}

export function serializeThreadEventListItem(
  r: ThreadEventDbRow
): ThreadEventListItem {
  const kind =
    (r.metadata as any)?.kind === 'pr' ||
    (r.metadata as any)?.kind === 'review' ||
    (r.metadata as any)?.kind === 'meeting' ||
    (r.metadata as any)?.kind === 'ooo'
      ? ((r.metadata as any).kind as 'pr' | 'review' | 'meeting' | 'ooo')
      : // TODO: consider a better fallback mapping (eventType/sourceEntityTable)
        ('pr' as const);

  return {
    eventId: r.eventId,
    kind,
    occurredAt: r.occurredAt.toISOString(),
    endAt: r.endAt?.toISOString?.() ?? null,
    title: r.title,
    subtitle: r.subtitle ?? null,
    url: r.url ?? null,
    repoFullName: r.repoFullName ?? null,
    prNumber: r.prNumber ?? null,
    assignment: {
      assignedBy: r.assignedBy,
      confidence: r.assignmentConfidence ?? null,
      reason: r.assignmentReason ?? null,
      createdAt: r.assignedAt?.toISOString?.() ?? undefined,
    },
    inspectorRef: {
      source: r.source,
      sourceEntityTable: r.sourceEntityTable as any,
      sourceEntityId: r.sourceEntityId,
    },
    metadata: (r.metadata as any) ?? null,
  };
}

export function serializeActivityEventListItem(
  r: ActivityEventDbRow
): ActivityEventListItem {
  const kind =
    (r.metadata as any)?.kind === 'pr' ||
    (r.metadata as any)?.kind === 'review' ||
    (r.metadata as any)?.kind === 'meeting' ||
    (r.metadata as any)?.kind === 'ooo'
      ? ((r.metadata as any).kind as 'pr' | 'review' | 'meeting' | 'ooo')
      : // TODO: consider a better fallback mapping (eventType/sourceEntityTable)
        ('pr' as const);

  return {
    eventId: r.eventId,
    kind,
    occurredAt: r.occurredAt.toISOString(),
    endAt: r.endAt?.toISOString?.() ?? null,
    title: r.title,
    subtitle: r.subtitle ?? null,
    url: r.url ?? null,
    repoFullName: r.repoFullName ?? null,
    prNumber: r.prNumber ?? null,
    inspectorRef: {
      source: r.source,
      sourceEntityTable: r.sourceEntityTable as any,
      sourceEntityId: r.sourceEntityId,
    },
    metadata: (r.metadata as any) ?? null,
  };
}
