import { PrepItem } from '@/lib/db/schema';
import { PrepMeetingType } from '@/types/api/prep';
import { subDays } from 'date-fns';

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

type DerivedWindow = {
  startAt: Date;
  endAt: Date;
  lookbackDays: number;
  source:
    | 'since_last_occurrence_end'
    | 'since_last_occurrence_start'
    | 'default_days';
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function getWindowsFromPrepItem(prepItem: PrepItem): {
  primary: DerivedWindow;
  secondary: DerivedWindow;
} {
  return {
    primary: {
      startAt: prepItem.primaryWindowStartAt,
      endAt: prepItem.primaryWindowEndAt,
      source: prepItem.primaryWindowSource as any,
      lookbackDays: 0,
    },
    secondary: {
      startAt: prepItem.secondaryWindowStartAt,
      endAt: prepItem.secondaryWindowEndAt,
      source: prepItem.secondaryWindowSource as any,
      lookbackDays: 0,
    },
  };
}

export function derivePrepWindows(ctx: WindowContext): {
  primary: DerivedWindow;
  secondary: DerivedWindow;
} {
  const endAt = ctx.meetingStartAt ? new Date(ctx.meetingStartAt) : new Date();

  let primaryStartAt: Date | null = null;
  let primarySource: DerivedWindow['source'] = 'default_days';

  if (ctx.previousMeetingEndAt) {
    const prevEnd = new Date(ctx.previousMeetingEndAt);
    if (prevEnd < endAt) {
      primaryStartAt = prevEnd;
      primarySource = 'since_last_occurrence_end';
    }
  }

  if (!primaryStartAt && ctx.previousMeetingStartAt) {
    const prevStart = new Date(ctx.previousMeetingStartAt);
    if (prevStart < endAt) {
      primaryStartAt = prevStart;
      primarySource = 'since_last_occurrence_start';
    }
  }

  if (!primaryStartAt) {
    const defaultDays = DEFAULT_PRIMARY_DAYS[ctx.meetingType] ?? 7;
    const days = clamp(defaultDays, 1, MAX_PRIMARY_DAYS);
    primaryStartAt = subDays(endAt, days);
    primarySource = 'default_days';
  }

  const primaryLookbackDays = Math.max(
    1,
    Math.ceil(
      (endAt.getTime() - primaryStartAt.getTime()) / (24 * 60 * 60 * 1000)
    )
  );

  const primary: DerivedWindow = {
    startAt: primaryStartAt!,
    endAt,
    lookbackDays: primaryLookbackDays,
    source: primarySource,
  };

  const secondaryDays = DEFAULT_SECONDARY_DAYS[ctx.meetingType] ?? 28;
  const secondaryStartAt = subDays(endAt, secondaryDays);

  const secondary: DerivedWindow = {
    startAt: secondaryStartAt,
    endAt,
    lookbackDays: secondaryDays,
    source: 'default_days',
  };

  return { primary, secondary };
}
