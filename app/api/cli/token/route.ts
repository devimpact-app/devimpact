import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { generateCliToken, hashCliToken } from '@/lib/utils/crypto';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { withSentryUser } from '@/lib/withSentryUser';

export const POST = withSentryUser(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const userId = session.user.id;

  const plainToken = generateCliToken();
  const tokenHash = hashCliToken(plainToken);

  const [row] = await db
    .select({ setupState: users.setupState })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const nowISO = new Date().toISOString();

  const prev = (row?.setupState as any) ?? { v: 1 };
  const nextSetupState = {
    ...prev,
    v: 1,
    github: {
      ...(prev.github ?? {}),
      cliTokenGenerated: true,
    },
    updatedAt: nowISO,
  };

  const newOnboardingState =
    session.user.onboardingState === 'account_created'
      ? { onboardingState: 'cli_pending' }
      : {};

  await db
    .update(users)
    .set({
      cliTokenHash: tokenHash,
      setupState: nextSetupState,
      ...newOnboardingState,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return NextResponse.json({ cliToken: plainToken });
});
