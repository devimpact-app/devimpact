import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { jsonBadRequest, jsonUnauthorized } from '../../_lib/http';
import { hashCliToken } from '@/lib/utils/crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const cliToken = body.cliToken as string | undefined;
    const githubLogin = body.githubLogin as string | undefined;

    if (!cliToken || !githubLogin) {
      return jsonBadRequest('Missing cliToken or githubLogin');
    }

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
    await db
      .update(users)
      .set({
        cliLinkedAt: new Date(),
        ...newOnboardingState,
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
}
