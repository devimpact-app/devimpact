import { getAuthoredPrs } from '../timeline/db/getAuthoredPrs';
import { SignalContext } from './types';

export type BuildSignalContextArgs = {
  userId: string;
  start: Date;
  end: Date;
};

export async function buildSignalsContext(
  args: BuildSignalContextArgs
): Promise<SignalContext> {
  const { userId, start, end } = args;

  const authoredPrs = await getAuthoredPrs({
    start,
    end,
    tenantId: userId,
  });

  return {
    userId,
    windowStart: start,
    windowEnd: end,
    authoredPrs,
  };
}
