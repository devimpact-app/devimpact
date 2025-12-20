import { buildWorkRhythm } from '@/lib/analysis/work-rhythm/buildWorkRhythm';
import { WorkRhythm } from '@/types/api/work-rhythm';

export type FetchPrepWorkRhythmResponse = {
  llm: {
    summary: WorkRhythm['summary'];
  };
  full: {};
};

export async function fetchWorkRhythmForWindow({
  tenantId,
  timezone,
  start,
  end,
}: {
  tenantId: string;
  timezone: string;
  start: Date;
  end: Date;
}): Promise<FetchPrepWorkRhythmResponse> {
  const rhythm = await buildWorkRhythm({
    userId: tenantId,
    startOverride: start,
    endOverride: end,
    timezone,
  });
  return {
    llm: {
      summary: rhythm.summary,
    },
    full: {},
  };
}
