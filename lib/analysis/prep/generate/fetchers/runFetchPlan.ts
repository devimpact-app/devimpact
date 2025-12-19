import { PrepMeetingType } from '@/types/api/prep';
import { getActivityForOneOnOneRange } from '../../one-on-ones/activity';
import { FetchKey, MEETING_FETCH_PLANS } from './config';
import { fetchInsightsForWindow } from '../../one-on-ones/insights';
import { fetchMetricsForWindows } from '../../one-on-ones/metrics';
import { buildWorkRhythm } from '@/lib/analysis/work-rhythm/buildWorkRhythm';

type FetchCtx = {
  tenantId: string;
  timezone: string;
  primary: { start: Date; end: Date };
  secondary: { start: Date; end: Date };
};

type FetchResults = Partial<Record<FetchKey, { llm: unknown; full: unknown }>>;

export async function runFetchPlan(args: {
  meetingType: PrepMeetingType;
  ctx: FetchCtx;
}): Promise<FetchResults> {
  const plan = MEETING_FETCH_PLANS[args.meetingType];
  const { ctx } = args;

  const tasks: Array<Promise<[FetchKey, { llm: unknown; full: unknown }]>> = [];

  for (const key of plan.keys) {
    switch (key) {
      case 'activityPrimary':
        tasks.push(
          (async () => [
            key,
            await getActivityForOneOnOneRange({
              tenantId: ctx.tenantId,
              start: ctx.primary.start,
              end: ctx.primary.end,
              timezone: ctx.timezone,
            }),
          ])()
        );
        break;

      case 'meetingsPrimary':
        tasks.push(
          (async () => [
            key,
            await fetchMeetingsContext({
              tenantId: ctx.tenantId,
              start: ctx.primary.start,
              end: ctx.primary.end,
              timezone: ctx.timezone,
            }),
          ])()
        );
        break;

      case 'insightsSecondary':
        tasks.push(
          (async () => [
            key,
            await fetchInsightsForWindow({
              tenantId: ctx.tenantId,
              start: ctx.secondary.start,
              end: ctx.secondary.end,
              timezone: ctx.timezone,
            }),
          ])()
        );
        break;

      case 'metricsPrimaryAndSecondary':
        tasks.push(
          (async () => [
            key,
            await fetchMetricsForWindows({
              tenantId: ctx.tenantId,
              windows: [
                {
                  key: 'short',
                  start: ctx.primary.start,
                  end: ctx.primary.end,
                },
                {
                  key: 'medium',
                  start: ctx.secondary.start,
                  end: ctx.secondary.end,
                },
              ],
            }),
          ])()
        );
        break;

      case 'workRhythmSecondary':
        tasks.push(
          (async () => [
            key,
            await buildWorkRhythm({
              tenantId: ctx.tenantId,
              start: ctx.secondary.start,
              end: ctx.secondary.end,
              timezone: ctx.timezone,
            }),
          ])()
        );
        break;

      // Future standup extras:
      case 'inFlightPRs':
        tasks.push((async () => [key, await fetchInFlightPRs(ctx)])());
        break;

      case 'waitingOnMeReviews':
        tasks.push((async () => [key, await fetchWaitingOnMeReviews(ctx)])());
        break;
    }
  }

  const resolved = await Promise.all(tasks);
  const out: FetchResults = {};
  for (const [k, v] of resolved) out[k] = v;
  return out;
}
