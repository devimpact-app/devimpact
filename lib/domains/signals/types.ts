import { PullRequest } from '@/lib/db/schema';
import { Signal } from '@/types/api/signals';

export type SignalContext = {
  userId: string;
  windowStart: Date;
  windowEnd: Date;
  authoredPrs: PullRequest[];
};

export type SignalGenerator = (ctx: SignalContext) => Signal[];
