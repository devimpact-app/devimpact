import { PrepMeetingType } from '@/types/api/prep';
import { FetchPrepMetricsResponse } from './metrics';
import { FetchPrepInsightsResponse } from './insights';
import { FetchPrepWorkRhythmResponse } from './workRhythm';
import { FetchPrepActivityResponse } from './activity';
import { FetchMeetingsRecapResponse } from './recentMeetings';
import { FetchMeetingsUpcomingResponse } from './upcomingMeetings';
import { FetchOOOContextResponse } from './ooo';

export const FetchSpec = {
  activityPrimary: {} as FetchPrepActivityResponse,
  workRhythmSecondary: {} as FetchPrepWorkRhythmResponse,
  insightsSecondary: {} as FetchPrepInsightsResponse,
  metricsPrimaryAndSecondary: {} as FetchPrepMetricsResponse,
  meetingsPrimary: {} as FetchMeetingsRecapResponse,
  upcomingMeetings: {} as FetchMeetingsUpcomingResponse,
  ooo: {} as FetchOOOContextResponse,
};

export type FetchKey = keyof typeof FetchSpec;

export type FetchSpecMap = {
  [K in FetchKey]: (typeof FetchSpec)[K];
};

export type FetchResults = Partial<{
  [K in FetchKey]: FetchSpecMap[K];
}>;

export type MeetingFetchPlan = {
  keys: readonly FetchKey[];
  uses: {
    primary: boolean;
    secondary: boolean;
  };
};

export const MEETING_FETCH_PLANS: Record<PrepMeetingType, MeetingFetchPlan> = {
  standup: {
    keys: [
      'activityPrimary',
      'meetingsPrimary',
      'upcomingMeetings',
      'ooo',
      // add later:
      // 'inFlightPRs',
      // 'waitingOnMeReviews',
    ],
    uses: { primary: true, secondary: false },
  },

  oneOnOne: {
    keys: [
      'activityPrimary',
      'meetingsPrimary',
      'insightsSecondary',
      'metricsPrimaryAndSecondary',
      'workRhythmSecondary',
    ],
    uses: { primary: true, secondary: true },
  },

  planning: {
    keys: [
      'activityPrimary',
      'meetingsPrimary',
      'insightsSecondary',
      'metricsPrimaryAndSecondary',
      'workRhythmSecondary',
    ],
    uses: { primary: true, secondary: true },
  },

  retro: {
    keys: [
      'activityPrimary',
      'meetingsPrimary',
      'insightsSecondary',
      'metricsPrimaryAndSecondary',
      'workRhythmSecondary',
    ],
    uses: { primary: true, secondary: true },
  },
};
