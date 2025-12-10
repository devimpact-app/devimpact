export type OnboardingState =
  | 'account_created'
  | 'cli_pending'
  | 'cli_linked'
  | 'syncing'
  | 'synced';

export type CliStatus = {
  onboardingState: OnboardingState;
  hasCliToken: boolean;
  cliLinkedAt?: string | null;
  hasActivity: boolean;
  lastSyncAt?: string | null;
  selectedRepos: number;
  recommendedStartISO: string;
};
