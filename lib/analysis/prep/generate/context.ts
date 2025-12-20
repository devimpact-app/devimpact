import { PrepItem } from '@/lib/db/schema';
import { PrepMeetingType } from '@/types/api/prep';

export type MeetingContext = {
  meetingType: PrepMeetingType;
  meetingStartAtISO: string;
  meetingEndAtISO: string | null;
  title: string | null;
  timezone: string;
  primaryWindowStartISO: string;
  primaryWindowEndISO: string;
  secondaryWindowStartISO: string;
  secondaryWindowEndISO: string;
};

export function buildMeetingContext(prepItem: PrepItem): MeetingContext {
  const endISO =
    prepItem.endAt?.toISOString() ??
    (prepItem.durationMinutes
      ? new Date(
          prepItem.startAt.getTime() + prepItem.durationMinutes * 60_000
        ).toISOString()
      : null);

  return {
    meetingType: prepItem.meetingType as PrepMeetingType,
    meetingStartAtISO: prepItem.startAt.toISOString(),
    meetingEndAtISO: endISO,
    title: prepItem.titleRedacted ?? null,
    timezone: prepItem.timezone,

    primaryWindowStartISO: prepItem.primaryWindowStartAt.toISOString(),
    primaryWindowEndISO: prepItem.primaryWindowEndAt.toISOString(),
    secondaryWindowStartISO: prepItem.secondaryWindowStartAt.toISOString(),
    secondaryWindowEndISO: prepItem.secondaryWindowEndAt.toISOString(),
  };
}
