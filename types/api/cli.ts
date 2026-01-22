type SetupStepStatus = 'not_started' | 'running' | 'succeeded' | 'failed';

type SetupStep = {
  status: SetupStepStatus;
  updatedAt?: string;
  lastError?: string;
};

export type SetupStateV1 = {
  v: 1;
  github: {
    cliTokenGenerated: boolean;
    cliTokenLinked: boolean;
    lastSyncAt?: string;
  };
  gcal?: {
    connected: boolean;
    lastSyncAt?: string;
  };
  bootstrapRecent: SetupStep;
  backfill90d: SetupStep;
  ready: boolean;
  updatedAt?: string;
};

export type OnboardingState =
  | 'account_created'
  | 'cli_pending'
  | 'cli_linked'
  | 'syncing'
  | 'synced';

export type CliStatus = {
  onboardingState: OnboardingState;
  setupState: SetupStateV1;
  hasCliToken: boolean;
  cliLinkedAt?: string | null;
  hasActivity: boolean;
  lastSyncAt?: string | null;
  selectedRepos: number;
  selectedRepoNames?: string[];
  availableReposCount: number;
  recommendedStartISO: string;
};
