'use server';

import {
  generateOneOnOnePrep,
  getDatesForOneOnOne,
} from '@/lib/analysis/prep/one-on-ones/generateOneOnOnePrep';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { oneOnOneSessions } from '@/lib/db/schema';
import {
  CreateOneOnOneInput,
  TCreateOneOnOneInput,
} from '@/types/api/one-on-one';

export async function createOneOnOneWithGeneration(
  rawInput: TCreateOneOnOneInput
) {
  const session = await auth();
  if (!session?.user) throw new Error('Cannot invoke server action');

  const parseResponse = CreateOneOnOneInput.safeParse(rawInput);
  if (!parseResponse.success) {
    throw new Error('Invalid params to server action');
  }
  const input = parseResponse.data;

  const {
    shortWindowStart,
    shortWindowEnd,
    mediumWindowStart,
    mediumWindowEnd,
    meetingAt,
    shortWindowWeeks,
  } = getDatesForOneOnOne({
    shortWindowStart: input.shortWindowStart,
    windowWeeks: input.windowWeeks,
    rawMeetingAt: input.meetingAt,
  });
  const [row] = await db
    .insert(oneOnOneSessions)
    .values({
      tenantId: session.user.id,
      title: input.title,
      shortWindowStart,
      shortWindowEnd,
      mediumWindowStart,
      mediumWindowEnd,
      shortWindowWeeks,
      payload: {} as any,
      status: 'pending',
      meetingAt,
      counterpartLabel: input.counterpartLabel,
      counterpartType: input.counterpartType,
    } as any)
    .onConflictDoUpdate({
      target: [
        oneOnOneSessions.tenantId,
        oneOnOneSessions.meetingAt,
        oneOnOneSessions.counterpartType,
      ],
      set: {
        title: input.title,
        shortWindowStart,
        shortWindowEnd,
        mediumWindowStart,
        mediumWindowEnd,
        shortWindowWeeks,
        meetingAt,
        payload: {} as any,
        status: 'pending',
        counterpartLabel: input.counterpartLabel,
        counterpartType: input.counterpartType,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Return the ID so client can navigate
  return { id: row.id };
}
