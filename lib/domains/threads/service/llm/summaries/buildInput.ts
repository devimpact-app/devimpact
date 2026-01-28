import { ThreadCategory } from '@/lib/db/schema/activity';
import { ExistingThreadContext, ThreadCandidateEvent } from '../assign/types';
import { ThreadSummaryLLMInput } from './types';

type BuildThreadSummaryInputsArgs = {
  finalEvents: ThreadCandidateEvent[];
  existingThreads: ExistingThreadContext[];
  createdThreads: Array<{
    id: string;
    categoryKey: ThreadCategory;
    title: string;
  }>;
  insertedThreadEvents: Array<{
    threadId: string;
    activityEventId: string;
  }>;
};

export function buildThreadSummaryInputs({
  finalEvents,
  existingThreads,
  createdThreads,
  insertedThreadEvents,
}: BuildThreadSummaryInputsArgs): ThreadSummaryLLMInput[] {
  const finalEventsById = new Map(finalEvents.map((e) => [e.id, e]));
  const existingById = new Map(existingThreads.map((t) => [t.id, t]));
  const createdById = new Map(createdThreads.map((t) => [t.id, t]));

  const newEventIdsByThreadId = new Map<string, string[]>();
  for (const te of insertedThreadEvents) {
    const arr = newEventIdsByThreadId.get(te.threadId) ?? [];
    arr.push(te.activityEventId);
    newEventIdsByThreadId.set(te.threadId, arr);
  }

  const inputs: ThreadSummaryLLMInput[] = [];
  for (const [threadId, activityEventIds] of newEventIdsByThreadId.entries()) {
    const newEvents = activityEventIds
      .map((id) => finalEventsById.get(id))
      .filter((x): x is ThreadCandidateEvent => Boolean(x));

    if (newEvents.length === 0) continue;

    const existing = existingById.get(threadId);
    if (existing) {
      inputs.push({
        mode: 'update_existing',
        threadId: existing.id,
        thread: existing,
        newEvents,
      });
      continue;
    }

    const created = createdById.get(threadId);
    if (created) {
      inputs.push({
        mode: 'create_new',
        threadId: created.id,
        thread: {
          categoryKey: created.categoryKey,
          proposedTitle: created.title,
        },
        newEvents,
      });
      continue;
    }

    continue;
  }

  return inputs;
}
