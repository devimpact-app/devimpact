import { JobKind } from '@/types/api/jobs';
import { JobHandlerInput, JobHandlerResult } from './types';
import { handleSetupBootstrapRecent } from './bootstrap/run';
import { handleThreadingRecent } from './threadingRecent/run';

export type JobHandler = (input: JobHandlerInput) => Promise<JobHandlerResult>;

export const jobHandlers: Partial<Record<JobKind, JobHandler>> = {
  setup_bootstrap_recent: handleSetupBootstrapRecent,
  threading_recent: handleThreadingRecent,
};
