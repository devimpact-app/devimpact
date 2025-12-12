import 'server-only';
import { db } from '@/lib/db/client';
import { integrationTokens } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

type GoogleTokenRow = typeof integrationTokens.$inferSelect;

async function loadGoogleToken(userId: string): Promise<GoogleTokenRow | null> {
  const [row] = await db
    .select()
    .from(integrationTokens)
    .where(
      and(
        eq(integrationTokens.userId, userId),
        eq(integrationTokens.provider, 'google_calendar'),
        eq(integrationTokens.tokenType, 'oauth')
      )
    )
    .limit(1);

  return row ?? null;
}

async function refreshGoogleAccessToken(row: GoogleTokenRow) {
  if (!row.refreshToken) {
    throw new Error('No refresh token stored for Google Calendar integration.');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: row.refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Google refresh_token exchange failed (${res.status}): ${text}`
    );
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in?: number;
    token_type: string;
    scope?: string;
  };

  const expiresAt =
    typeof json.expires_in === 'number'
      ? new Date(Date.now() + json.expires_in * 1000)
      : null;

  // persist
  await db
    .update(integrationTokens)
    .set({
      accessToken: json.access_token,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(integrationTokens.id, row.id));

  return { accessToken: json.access_token, expiresAt };
}

export async function getGoogleCalendarAccessToken(userId: string) {
  const row = await loadGoogleToken(userId);
  if (!row) return null;

  // If we don't have expiresAt, assume valid and try once (Google tokens usually expire in 1h)
  const needsRefresh = row.expiresAt
    ? row.expiresAt.getTime() < Date.now() + 60_000
    : false; // refresh if expiring within 60s

  if (!needsRefresh) return row.accessToken;

  const refreshed = await refreshGoogleAccessToken(row);
  return refreshed.accessToken;
}
