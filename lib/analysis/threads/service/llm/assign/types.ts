import { ThreadCategory } from '@/lib/db/schema/activity';

export type ThreadCandidateEvent = {
  id: string;
  kind: 'pr' | 'review' | 'meeting';
  occurredAt: string;
  title: string;
  subtitle?: string;
  repo?: string;
  prNumber?: number;
  prSummary?: {
    short: string;
    highlights?: string[];
    typeTags?: string[];
    domainTags?: string[];
  };
  reviewTargetPrSummary?: {
    short: string;
    highlights?: string[];
    typeTags?: string[];
    domainTags?: string[];
  };
  signals: {
    size?: 'small' | 'medium' | 'large';
    role?: 'owner' | 'reviewer' | 'participant';
    outcome?: 'merged' | 'approved' | 'changes_requested' | 'commented';
    meetingCategory?: string; // incident/interview/org/etc
    meetingSubtype?: string; // architecture/designReview/demo/etc
    isRecurring?: boolean;
    durationMinutes?: number;
    organizerSelf?: boolean;
  };
};

export type ThreadSummaryBulletInput = {
  id: string;
  sortIndex: number;
  text: string;
  referencedEventIds: string[];
  editable: boolean;
};

export type ExistingThreadContext = {
  id: string;
  categoryKey: ThreadCategory;
  title: string;
  summaryHeadline?: string;
  bullets?: ThreadSummaryBulletInput[];
  firstActivityAt: string | null;
  lastActivityAt: string | null;
};

export type AssignThreadsInput = {
  mode: 'cold_start' | 'incremental';

  events: ThreadCandidateEvent[];

  existingThreads: ExistingThreadContext[];
};

export type ThreadAssignmentAction = 'assign_existing' | 'create_new' | 'skip';

type BaseThreadAssignment = {
  eventId: string;
  confidence: number; // 0..1
  reasons: string[];
};

export type AssignExistingThread = BaseThreadAssignment & {
  action: 'assign_existing';
  threadId: string;
};

export type CreateNewThread = BaseThreadAssignment & {
  action: 'create_new';
  newThreadKey: string;
};

export type SkipThreadAssignment = BaseThreadAssignment & {
  action: 'skip';
};

export type ThreadAssignment =
  | AssignExistingThread
  | CreateNewThread
  | SkipThreadAssignment;

export type NewThreadDescriptor = {
  newThreadKey: string;
  categoryKey: ThreadCategory;
  title: string;
  confidence: number; // 0..1
};

export type AssignThreadsOutput = {
  assignments: ThreadAssignment[];
  newThreads: NewThreadDescriptor[];
};
