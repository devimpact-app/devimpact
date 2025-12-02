import { OneOnOneResponse, OneOnOnePrep } from '@/types/api/one-on-one';
import { OneOnOneSession } from '@/lib/db/schema';

export function formatOneOnOneResponse(row: OneOnOneSession) {
  const { payload, ...rowProps } = row;

  const prep: OneOnOnePrep = {
    ...rowProps,
    createdAt: rowProps.createdAt.toISOString(),
    updatedAt: rowProps.updatedAt.toISOString(),
    meetingAt: rowProps.meetingAt.toISOString(),
    shortWindowStart: rowProps.shortWindowStart.toISOString(),
    shortWindowEnd: rowProps.shortWindowEnd.toISOString(),
    shortWindowWeeks: rowProps.shortWindowWeeks ?? undefined,
    mediumWindowStart: rowProps.mediumWindowStart.toISOString(),
    mediumWindowEnd: rowProps.mediumWindowEnd.toISOString(),

    talkingPoints: payload.talkingPoints,
    usedInsights: payload.usedInsights,
    usedMetrics: payload.usedMetrics,
    usedPrs: payload.usedPrs,
    usedReviews: payload.usedReviews,

    counterpartLabel: rowProps.counterpartLabel ?? undefined,
  };

  const parsed = OneOnOneResponse.safeParse({ prep });

  if (!parsed.success) {
    console.log(parsed.error);
    throw new Error('Failed to format one-on-one response');
  }

  return parsed.data;
}
