import { PrepMeetingType } from '@/types/api/prep';

export type WindowContext = {
  meetingStartAt?: Date;
  meetingType: PrepMeetingType;
  previousMeetingEndAt?: Date;
  previousMeetingStartAt?: Date;
};

const DEFAULT_PRIMARY_DAYS: Record<WindowContext['meetingType'], number> = {
  oneOnOne: 7,
  standup: 2,
  planning: 14,
  retro: 14,
};

const DEFAULT_SECONDARY_DAYS: Record<WindowContext['meetingType'], number> = {
  oneOnOne: 28,
  standup: 14,
  planning: 42,
  retro: 56,
};

const MAX_PRIMARY_DAYS = 21;

export function derivePrepWindows(ctx: WindowContext) {
  // TODO
}
