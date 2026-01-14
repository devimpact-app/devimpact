import { ThreadListItem } from '@/types/api/threads';
import { ThreadListDbRow } from '../db/read/listThreads';

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
