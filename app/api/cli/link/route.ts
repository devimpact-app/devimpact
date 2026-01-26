import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { jsonBadRequest, jsonUnauthorized } from '../../_lib/http';
import { hashCliToken } from '@/lib/utils/crypto';
import { withSentryUser } from '@/lib/withSentryUser';

import { z } from 'zod';

const CliLinkBodySchema = z
  .object({
    cliToken: z.string().min(5).max(256),
    githubLogin: z.string().min(1).max(100),
  })
  .strict();

export const POST = withSentryUser(async (req: NextRequest) => {
  try {
    const json = await req.json().catch(() => null);
    const parsed = CliLinkBodySchema.safeParse(json);

    if (!parsed.success) {
      return jsonBadRequest('Invalid request payload');
    }

    const { cliToken, githubLogin } = parsed.data;

    const user = await db.query.users.findFirst({
      where: eq(users.githubUsername, githubLogin),
    });

    if (!user) {
      return jsonUnauthorized(
        'No DevImpact account found for this GitHub user. ' +
          'Sign into the DevImpact app with GitHub first, then re-run `devimpact init`.'
      );
    }

    if (!user.cliTokenHash) {
      return jsonUnauthorized('No CLI token was generated for this user');
    }

    const incomingHash = hashCliToken(cliToken);
    if (user.cliTokenHash !== incomingHash) {
      return jsonUnauthorized('Invalid or expired cli token');
    }

    const newOnboardingState =
      user.onboardingState === 'cli_pending'
        ? {
            onboardingState: 'cli_linked',
          }
        : {};

    const nowISO = new Date().toISOString();

    const prev = (user.setupState as any) ?? { v: 1 };
    const nextSetupState = {
      ...prev,
      v: 1,
      github: {
        ...(prev.github ?? {}),
        cliTokenLinked: true,
        cliTokenGenerated: true,
      },
      updatedAt: nowISO,
    };
    await db
      .update(users)
      .set({
        cliLinkedAt: new Date(),
        ...newOnboardingState,
        setupState: nextSetupState,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      ok: true,
      tenantId: user.id,
    });
  } catch (err) {
    console.error('[CLI LINK] error:', err);
    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
});
