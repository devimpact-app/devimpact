import { ActivityEvent } from '@/types/api/timeline';

export function clusterCommitEvents(
  events: ActivityEvent[],
  opts: { maxGapMinutes?: number } = {}
): ActivityEvent[] {
  const { maxGapMinutes = 30 } = opts;
  if (events.length === 0) return events;

  const clustered: ActivityEvent[] = [];
  let buffer: ActivityEvent[] = [];

  function flushBuffer() {
    if (buffer.length === 0) return;

    if (buffer.length === 1) {
      clustered.push(buffer[0]);
    } else {
      const last = buffer[0];
      const commitCount = buffer.length;
      const cluster: ActivityEvent = {
        ...last,
        id: `${last.id}::commit_cluster_${commitCount}`,
        kind: 'commit_cluster' as any,
        occurredAt: last.occurredAt, // show time of latest
        meta: {
          ...(last as any).meta,
          commitCount,
        },
      };

      clustered.push(cluster);
    }

    buffer = [];
  }

  const isCommitKind = (e: ActivityEvent) => e.kind === 'pr_commit';

  const parseDate = (iso: string) => new Date(iso).getTime();

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];

    if (!isCommitKind(ev)) {
      flushBuffer();
      clustered.push(ev);
      continue;
    }

    if (buffer.length === 0) {
      buffer.push(ev);
      continue;
    }

    // Check time gap with previous commit event in buffer
    const lastInBuffer = buffer[0];
    const gapMs = Math.abs(
      parseDate(lastInBuffer.occurredAt) - parseDate(ev.occurredAt)
    );
    const gapMinutes = gapMs / (1000 * 60);

    if (gapMinutes <= maxGapMinutes) {
      buffer.unshift(ev);
    } else {
      flushBuffer();
      buffer.push(ev);
    }
  }
  flushBuffer();
  return clustered;
}
