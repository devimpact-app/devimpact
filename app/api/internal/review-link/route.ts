import { NextRequest } from 'next/server';
import { auth, REVIEW_UID } from '@/lib/auth';
import {
  jsonOK,
  jsonUnauthorized,
  jsonBadRequest,
  jsonServerError,
} from '@/app/api/_lib/http';
import { withSentryUser } from '@/lib/withSentryUser';
import { SignJWT } from 'jose';

const ADMIN_TENANT_ID = 'f7586fab-ea2d-4a9d-be3c-04be29ba071e';

type ReviewLinkClaims = {
  sub: string;
  tid: string;
  purpose: 'review_link';
  iat?: number;
  exp?: number;
};

const DEFAULT_TTL_MIN = 60 * 24; // 24h

function getSecretKey() {
  const s = process.env.REVIEW_LINK_SECRET;
  if (!s) throw new Error('Missing REVIEW_LINK_SECRET env var');
  return new TextEncoder().encode(s);
}

async function signReviewToken(
  payload: Omit<ReviewLinkClaims, 'iat' | 'exp'>,
  ttlMin: number
) {
  const secretKey = getSecretKey();
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlMin * 60)
    .sign(secretKey);
}

export const GET = withSentryUser(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    if (session.user.id !== ADMIN_TENANT_ID) {
      return jsonUnauthorized('Unauthorized');
    }

    const { searchParams } = new URL(req.url);

    const ttlMinRaw = searchParams.get('ttlMin');
    const ttlMin = ttlMinRaw ? Number(ttlMinRaw) : DEFAULT_TTL_MIN;
    if (!Number.isFinite(ttlMin) || ttlMin <= 0 || ttlMin > 60 * 24 * 7) {
      return jsonBadRequest('ttlMin must be between 1 and 10080 (7 days).');
    }

    const startedAt = Date.now();

    const token = await signReviewToken(
      {
        sub: 'review',
        tid: REVIEW_UID,
        purpose: 'review_link',
      },
      ttlMin
    );

    // Build a link you’ll send them
    // You can point this to a dedicated route that consumes the token.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;

    const url = new URL('/login/review', baseUrl);
    url.searchParams.set('t', token);

    return jsonOK({
      ok: true,
      tenantId: REVIEW_UID,
      ttlMin,
      token,
      url: url.toString(),
      durationMs: Date.now() - startedAt,
    });
  } catch (err: any) {
    console.error('[internal review-link] failed', {
      error: err?.message ?? String(err),
      stack: err?.stack,
    });
    return jsonServerError('Failed to create review link.');
  }
});
