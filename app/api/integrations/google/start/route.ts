import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

function base64url(buf: ArrayBuffer) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function sha256(input: string) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64url(digest);
}

function randomUrlSafeString(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64url(arr);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`;

  // CSRF + PKCE
  const state = randomUrlSafeString(32);
  const codeVerifier = randomUrlSafeString(48);
  const codeChallenge = await sha256(codeVerifier);

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');

  // Minimal scope: events read-only
  url.searchParams.set(
    'scope',
    [
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
    ].join(' ')
  );

  // PKCE
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  // Offline access
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);

  // Put state + verifier in HttpOnly cookies bound to uid
  const res = NextResponse.redirect(url.toString());
  const cookieBase = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 10 * 60, // 10 minutes
  };

  // Bind to current user id to prevent cross-user token attachment
  res.cookies.set('gcal_state', state, cookieBase);
  res.cookies.set('gcal_code_verifier', codeVerifier, cookieBase);
  res.cookies.set('gcal_uid', session.user.id, cookieBase);

  const passedUrl = req.nextUrl;
  const isFromSettings = passedUrl.searchParams.get('fromSettings') ?? 'false';
  res.cookies.set('from_settings', isFromSettings, cookieBase);

  return res;
}
