import { PrepMeetingType } from '@/types/api/prep';

export type FetchKey =
  | 'activityPrimary'
  | 'insightsSecondary'
  | 'metricsPrimaryAndSecondary'
  | 'workRhythmSecondary'
  | 'meetingsPrimary'
  // TODO: add
  | 'inFlightPRs'
  | 'waitingOnMeReviews';

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
