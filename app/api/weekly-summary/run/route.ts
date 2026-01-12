import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import {
  jsonBadRequest,
  jsonOK,
  jsonServerError,
  jsonUnauthorized,
} from '@/app/api/_lib/http';

import {
  RunWeeklySummaryRequestSchema,
  RunWeeklySummaryResponseSchema,
  WeeklySummaryRow,
} from '@/types/api/weekly-summary';
import { WeeklySummary } from '@/lib/db/schema/weekly-summary';
import { runWeeklySummary } from '@/lib/analysis/weekly-summary/runWeeklySummary';

function toIso(d: Date | null | undefined): string | null | undefined {
  if (!d) return d === null ? null : undefined;
  return d.toISOString();
}

function serializeWeeklySummaryRow(row: WeeklySummary): WeeklySummaryRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    weekStartLocalDate: row.weekStartLocalDate,
    timezone: row.timezone,
    rangeStartUtc: row.rangeStartUtc.toISOString(),
    rangeEndUtc: row.rangeEndUtc.toISOString(),
    status: row.status,
    generationStartedAt: toIso(row.generationStartedAt) ?? null,
    lastError: row.lastError ?? null,
    lastErrorAt: toIso(row.lastErrorAt) ?? null,
    claimedAt: toIso(row.claimedAt) ?? null,
    claimedBy: row.claimedBy ?? null,
    claimExpiresAt: toIso(row.claimExpiresAt) ?? null,
    attempts: row.attempts ?? 0,
    nextAttemptAt: toIso(row.nextAttemptAt) ?? null,
    emailedAt: toIso(row.emailedAt) ?? null,
    output: row.output ?? null,
    referencedThreadIds: row.referencedThreadIds ?? [],
    referencedEventIds: row.referencedEventIds ?? [],
    model: row.model ?? null,
    promptVersion: row.promptVersion ?? null,
    generatedAt: toIso(row.generatedAt) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const POST = withSentryUser(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  let rawBody: unknown = {};
  try {
    const contentLength = req.headers.get('content-length');
    if (!contentLength || Number(contentLength) > 0) {
      rawBody = await req.json();
    }
  } catch {
    return jsonBadRequest('Invalid JSON body');
  }

  const parsed = RunWeeklySummaryRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonBadRequest(
      `Invalid request: ${parsed.error.issues
        .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
        .join(' | ')}`
    );
  }

  const body = parsed.data;
  let result;
  try {
    result = await runWeeklySummary({
      tenantId: session.user.id,
      weekStartIso: body.weekStartIso,
      timezone: body.timezone,
      force: body.force,
    });
  } catch (e: any) {
    return jsonServerError(
      `Failed to run weekly summary: ${e?.message ?? 'unknown_error'}`
    );
  }

  const finalRow = result.finalRow;
  const resp = {
    action: result.claim.action,
    reason: result.claim.reason,
    processed: result.processed,
    weeklySummary: serializeWeeklySummaryRow(finalRow),
    ...(result.claim.action === 'skip_error' && result.claim.retryAfterMs
      ? { retryAfterMs: result.claim.retryAfterMs }
      : {}),
  };

  const outParsed = RunWeeklySummaryResponseSchema.safeParse(resp);
  if (!outParsed.success) {
    return jsonBadRequest(
      `Failed to parse weekly summary response: ${outParsed.error.issues
        .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
        .join(' | ')}`
    );
  }

  return jsonOK(outParsed.data);
});
