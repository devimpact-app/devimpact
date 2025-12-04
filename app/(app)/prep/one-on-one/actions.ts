'use server';

import { generateOneOnOnePrep } from '@/lib/analysis/one-on-ones/generateOneOnOnePrep';
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

  // Create placeholder
  const placeholderDate = new Date();
  const [row] = await db
    .insert(oneOnOneSessions)
    .values({
      tenantId: session.user.id,
      title: input.title,
      shortWindowStart: placeholderDate,
      shortWindowEnd: placeholderDate,
      mediumWindowStart: placeholderDate,
      mediumWindowEnd: placeholderDate,
      payload: {} as any,
      status: 'generating',
      meetingAt: input.meetingAt ? new Date(input.meetingAt) : new Date(),
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
        shortWindowStart: placeholderDate,
        shortWindowEnd: placeholderDate,
        mediumWindowStart: placeholderDate,
        mediumWindowEnd: placeholderDate,
        payload: {} as any,
        status: 'generating',
        counterpartLabel: input.counterpartLabel,
        counterpartType: input.counterpartType,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Kick off generation (doesn't wait)
  generateOneOnOnePrep({
    ...input,
    tenantId: session.user.id,
    timezone: input.timezone,
    db,
    updateDb: true,
  });

  // Return the ID so client can navigate
  return { id: row.id };
}
