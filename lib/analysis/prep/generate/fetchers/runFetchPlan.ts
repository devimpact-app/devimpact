import { PrepMeetingType } from '@/types/api/prep';
import { getActivityForOneOnOneRange } from './activity';
import {
  FetchKey,
  FetchResults,
  FetchSpecMap,
  MEETING_FETCH_PLANS,
} from './config';
import { fetchInsightsForWindow } from './insights';
import { fetchMetricsForWindows } from './metrics';
import { fetchWorkRhythmForWindow } from './workRhythm';
import { fetchMeetingsRecapPrimary } from './recentMeetings';
import { fetchMeetingsUpcoming } from './upcomingMeetings';
import { fetchOOOContext } from './ooo';
import { fetchInFlightContext } from './inFlight';

type FetchCtx = {
  tenantId: string;
  timezone: string;
  primary: { start: Date; end: Date };
  secondary: { start: Date; end: Date };
};

type Task<K extends FetchKey> = Promise<readonly [K, FetchSpecMap[K]]>;

function makeTask<K extends FetchKey>(
  key: K,
  run: () => Promise<FetchSpecMap[K]>
): Task<K> {
  return (async () => [key, await run()] as const)();
}

export async function runFetchPlan(args: {
  meetingType: PrepMeetingType;
  ctx: FetchCtx;
}): Promise<FetchResults> {
  const plan = MEETING_FETCH_PLANS[args.meetingType];
  const { ctx } = args;

  const tasks: Promise<readonly [FetchKey, FetchSpecMap[FetchKey]]>[] = [];
  for (const key of plan.keys) {
    switch (key) {
      case 'activityPrimary':
        tasks.push(
          makeTask('activityPrimary', () =>
            getActivityForOneOnOneRange({
              tenantId: ctx.tenantId,
              start: ctx.primary.start,
              end: ctx.primary.end,
              timezone: ctx.timezone,
            })
          )
        );
        break;

      case 'meetingsPrimary':
        tasks.push(
          (async () => [
            key,
            await fetchMeetingsRecapPrimary({
              tenantId: ctx.tenantId,
              start: ctx.primary.start,
              end: ctx.primary.end,
              timezone: ctx.timezone,
            }),
          ])()
        );
        break;

      case 'upcomingMeetings':
        tasks.push(
          (async () => [
            key,
            await fetchMeetingsUpcoming({
              tenantId: ctx.tenantId,
              timezone: ctx.timezone,
              now: ctx.primary.end,
            }),
          ])()
        );
        break;

      case 'ooo':
        tasks.push(
          (async () => [
            key,
            await fetchOOOContext({
              tenantId: ctx.tenantId,
              timezone: ctx.timezone,
              now: ctx.primary.end,
            }),
          ])()
        );
        break;

      case 'inFlight':
        tasks.push(
          (async () => [
            key,
            await fetchInFlightContext({
              tenantId: ctx.tenantId,
              timezone: ctx.timezone,
              now: ctx.primary.end,
            }),
          ])()
        );
        break;

      case 'insightsSecondary':
        tasks.push(
          makeTask('insightsSecondary', () =>
            fetchInsightsForWindow({
              tenantId: ctx.tenantId,
              start: ctx.secondary.start,
              end: ctx.secondary.end,
              timezone: ctx.timezone,
            })
          )
        );
        break;

      case 'metricsPrimaryAndSecondary':
        tasks.push(
          makeTask('metricsPrimaryAndSecondary', () =>
            fetchMetricsForWindows({
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
            })
          )
        );
        break;

      case 'workRhythmSecondary':
        tasks.push(
          makeTask('workRhythmSecondary', () =>
            fetchWorkRhythmForWindow({
              tenantId: ctx.tenantId,
              start: ctx.secondary.start,
              end: ctx.secondary.end,
              timezone: ctx.timezone,
            })
          )
        );
        break;
    }
  }

  const resolved = await Promise.all(tasks);
  const out: FetchResults = {};
  for (const pair of resolved) {
    const [k, v] = pair;
    out[k] = v as any;
  }
  return out;
}
