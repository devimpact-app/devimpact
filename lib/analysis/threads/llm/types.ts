export type ThreadCategory =
  | 'features'
  | 'bugs_incidents'
  | 'tech_debt'
  | 'collaboration'
  | 'alignment'
  | 'skill_growth'
  | 'hiring';

type ThreadCandidateEvent = {
  id: string;
  kind: 'pr' | 'review' | 'meeting';
  occurredAt: string;
  title: string;
  subtitle?: string;

  repo?: string;
  prNumber?: number;

  signals: {
    size?: 'small' | 'medium' | 'large';
    role?: 'owner' | 'reviewer' | 'participant';
    outcome?:
      | 'merged'
      | 'approved'
      | 'changes_requested'
      | 'incident'
      | 'interview';
    meetingType?:
      | 'architecture'
      | 'designReview'
      | 'demo'
      | 'incident'
      | 'interview'
      | 'org';
  };
};

type ExistingThreadContext = {
  id: string;
  categoryKey: ThreadCategory;
  title: string;
  summary: string;
  firstActivityAt: string;
  lastActivityAt: string;
};

export type AssignThreadsInput = {
  mode: 'cold_start' | 'incremental';

  events: ThreadCandidateEvent[];

  existingThreads: ExistingThreadContext[];
};
