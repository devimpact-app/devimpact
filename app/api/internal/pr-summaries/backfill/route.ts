import { NextRequest } from 'next/server';
import { and, eq, isNull, gte } from 'drizzle-orm';
import { withSentryUser } from '@/lib/withSentryUser';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { pullRequests, prSummaries } from '@/lib/db/schema';
import { jsonOK, jsonUnauthorized } from '@/app/api/_lib/http';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { getOrGeneratePrSummary } from '@/lib/domains/pull-requests/service/getOrGeneratePrSummary';

const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_BATCH_SIZE = 5;
const MAX_LOOKBACK_DAYS = 90;
const MAX_BATCH_SIZE = 20;
const MAX_CONCURRENCY = 3;

function parseClampedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const n = value != null ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  const clamped = Math.min(Math.max(n, min), max);
  return clamped;
}

export const POST = withSentryUser(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const tenantId = session.user.id;

  const { searchParams } = new URL(req.url);
  const batchSize = parseClampedInt(
    searchParams.get('limit'),
    DEFAULT_BATCH_SIZE,
    1,
    MAX_BATCH_SIZE
  );

  const lookbackDays = parseClampedInt(
    searchParams.get('lookbackDays'),
    DEFAULT_LOOKBACK_DAYS,
    1,
    MAX_LOOKBACK_DAYS
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  const prsNeedingSummary = await db
    .select()
    .from(pullRequests)
    .leftJoin(
      prSummaries,
      and(
        eq(prSummaries.tenantId, tenantId),
        eq(prSummaries.prId, pullRequests.id)
      )
    )
    .where(
      and(
        eq(pullRequests.tenantId, tenantId),
        gte(pullRequests.createdAt, cutoff),
        isNull(prSummaries.id) // no summary yet
      )
    )
    .limit(batchSize);

  if (prsNeedingSummary.length === 0) {
    return jsonOK({
      processed: 0,
      remaining: 0,
    });
  }

  let processed = 0;

  await mapWithConcurrency(prsNeedingSummary, MAX_CONCURRENCY, async (row) => {
    const pr = row.pull_requests;
    await getOrGeneratePrSummary({
      tenantId,
      prId: pr.id,
    });
    processed += 1;
  });

  return jsonOK({
    processed,
    remaining: Math.max(0, prsNeedingSummary.length - processed),
  });
});
