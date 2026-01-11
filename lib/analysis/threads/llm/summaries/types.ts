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

export type ThreadSummaryBullet = {
  bulletId: string | null;
  text: string;
  referencedEventIds: string[];
  sortIndex: number;
};

export type ThreadSummaryUpdates = {
  headline: string | null;
  bullets: string[] | null;
  referencedEventIds: string[] | null;
};

export type ThreadSummaryOutput = {
  title: string;
  headline: string;
  bullets: ThreadSummaryBullet[];
  confidence: number;
  reasons: string[];
  updates: ThreadSummaryUpdates | null;
};
