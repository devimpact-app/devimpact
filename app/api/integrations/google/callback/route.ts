import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { integrationTokens, users } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { listCalendarsWithToken } from '@/lib/integrations/gcal/api';
import { GoogleCalendarListItem } from '@/lib/integrations/gcal/types';
import { calendarSelections } from '@/lib/db/schema/gcal';

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
};

function clearCookies(res: NextResponse) {
  const clear = { path: '/', maxAge: 0 };
  res.cookies.set('gcal_state', '', clear);
  res.cookies.set('gcal_code_verifier', '', clear);
  res.cookies.set('gcal_uid', '', clear);
  res.cookies.set('gcal_return_to', '', clear);
  res.cookies.set('from_settings', '', clear);
}

function handleError(redirectBase: URL, errorReason: string, detail?: string) {
  redirectBase.searchParams.set('gcal', 'error');
  redirectBase.searchParams.set('reason', errorReason);
  if (detail) redirectBase.searchParams.set('detail', detail);
  const res = NextResponse.redirect(redirectBase);
  clearCookies(res);
  return res;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL));
  }

  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDesc = url.searchParams.get('error_description');

  const stateCookie = req.cookies.get('gcal_state')?.value;
  const verifier = req.cookies.get('gcal_code_verifier')?.value;
  const uidCookie = req.cookies.get('gcal_uid')?.value;
  const fromSettings = req.cookies.get('from_settings')?.value;
  const isFromSettings = fromSettings === 'true';
  const returnTo = '/onboarding/calendar';
  const redirectBase = new URL(returnTo, process.env.NEXTAUTH_URL);
  if (isFromSettings) {
    redirectBase.searchParams.set('fromSettings', 'true');
  }

  // handle explicit OAuth errors (user denied, etc.)
  if (error) {
    return handleError(redirectBase, error, errorDesc?.slice(0, 200));
  }

  // state/verifier checks
  if (!code || !state || !stateCookie || state !== stateCookie || !verifier) {
    return handleError(redirectBase, 'state_mismatch');
  }

  // bind OAuth attempt to same logged-in user
  if (!uidCookie || uidCookie !== session.user.id) {
    return handleError(redirectBase, 'user_mismatch');
  }

  // exchange code -> tokens (PKCE verifier included)
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`,
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    return handleError(redirectBase, 'token_exchange_failed');
  }

  const tokens = (await tokenRes.json()) as GoogleTokenResponse;

  const expiresAt =
    typeof tokens.expires_in === 'number'
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

  // preserve refresh token if Google doesn't return it on subsequent consents
  const existing = await db
    .select()
    .from(integrationTokens)
    .where(
      and(
        eq(integrationTokens.userId, session.user.id),
        eq(integrationTokens.provider, 'google_calendar'),
        eq(integrationTokens.tokenType, 'oauth')
      )
    )
    .limit(1);

  const refreshToken =
    tokens.refresh_token ?? existing[0]?.refreshToken ?? null;

  const [savedToken] = await db
    .insert(integrationTokens)
    .values({
      userId: session.user.id,
      provider: 'google_calendar',
      tokenType: 'oauth',
      accessToken: tokens.access_token,
      refreshToken,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [
        integrationTokens.userId,
        integrationTokens.provider,
        integrationTokens.tokenType,
      ],
      set: {
        accessToken: tokens.access_token,
        refreshToken,
        expiresAt,
        updatedAt: new Date(),
      },
    })
    .returning({ id: integrationTokens.id });

  const integrationTokenId = savedToken?.id;
  if (!integrationTokenId) {
    return handleError(redirectBase, 'token_save_failed');
  }

  const nowISO = new Date().toISOString();

  await db
    .update(users)
    .set({
      setupState: sql`
      jsonb_set(
        jsonb_set(
          COALESCE(${users.setupState}, '{"v":1}'::jsonb),
          '{gcal}',
          jsonb_build_object(
            'connected', true,
            'lastSyncAt', COALESCE((${users.setupState} #>> '{gcal,lastSyncAt}'), NULL)
          ),
          true
        ),
        '{updatedAt}',
        to_jsonb(${nowISO}::text),
        true
      )
    `,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  let calendars: GoogleCalendarListItem[] = [];
  try {
    calendars = await listCalendarsWithToken(tokens.access_token);
  } catch (e) {
    return handleError(redirectBase, 'calendar_discovery_failed');
  }

  if (calendars.length > 0) {
    const values = calendars.map((c) => ({
      tenantId: session.user.id,
      integrationTokenId,
      calendarId: c.id,
      summary: c.summary ?? c.id,
      timeZone: c.timeZone ?? null,
      accessRole: c.accessRole ?? null,
      isPrimary: Boolean(c.primary),
      isSelected: Boolean(c.primary),
      updatedAt: new Date(),
    }));

    await db
      .insert(calendarSelections)
      .values(values)
      .onConflictDoUpdate({
        target: [
          calendarSelections.tenantId,
          calendarSelections.integrationTokenId,
          calendarSelections.calendarId,
        ],
        set: {
          summary: sql`excluded.summary`,
          timeZone: sql`excluded.time_zone`,
          accessRole: sql`excluded.access_role`,
          isPrimary: sql`excluded.is_primary`,
          updatedAt: new Date(),
        },
      });
  }

  redirectBase.searchParams.set('gcal', 'connected');
  const res = NextResponse.redirect(redirectBase);
  clearCookies(res);
  return res;
}
