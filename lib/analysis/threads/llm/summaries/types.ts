import { ThreadCategory } from '@/lib/db/schema/activity';
import { ExistingThreadContext, ThreadCandidateEvent } from '../assign/types';

type ThreadSummaryCommonInput = {
  threadId: string;
  newEvents: ThreadCandidateEvent[];
  recentThreadEvents?: ThreadCandidateEvent[];
};

export type ThreadSummaryLLMInput =
  | (ThreadSummaryCommonInput & {
      mode: 'update_existing';
      thread: ExistingThreadContext;
    })
  | (ThreadSummaryCommonInput & {
      mode: 'create_new';
      thread: {
        categoryKey: ThreadCategory;
        proposedTitle: string;
      };
    });

export type ThreadSummaryOutput = {
  title: string;
  summary: string;
  confidence: number;
  reasons: string[];
  // What changed since last time
  updates: {
    headline: string | null;
    bullets: string[] | null;
    referencedEventIds: string[] | null;
  } | null;
};
