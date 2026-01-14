import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import {
  jsonBadRequest,
  jsonNotFound,
  jsonOK,
  jsonUnauthorized,
} from '../../_lib/http';
import { GetWeeklySummaryDetailResponseSchema } from '@/types/api/weekly-summary';
import { weeklySummaries } from '@/lib/db/schema/weekly-summary';

export const GET = withSentryUser(
  async (_req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');
    const tenantId = session.user.id;

    const { id } = await context.params;
    const row = await db
      .select()
      .from(weeklySummaries)
      .where(
        and(eq(weeklySummaries.tenantId, tenantId), eq(weeklySummaries.id, id))
      )
      .limit(1);

    if (!row.length) return jsonNotFound('Weekly summary not found');

    const r = row[0];

    const out = {
      summary: {
        id: r.id,
        weekStartLocalDate: r.weekStartLocalDate,
        timezone: r.timezone,
        rangeStartUtc: r.rangeStartUtc.toISOString(),
        rangeEndUtc: r.rangeEndUtc.toISOString(),
        status: r.status,
        generationStartedAt: r.generationStartedAt?.toISOString?.() ?? null,
        claimedAt: r.claimedAt?.toISOString?.() ?? null,
        claimExpiresAt: r.claimExpiresAt?.toISOString?.() ?? null,
        claimedBy: r.claimedBy ?? null,
        attempts: Number(r.attempts ?? 0),
        nextAttemptAt: r.nextAttemptAt?.toISOString?.() ?? null,
        emailedAt: r.emailedAt?.toISOString?.() ?? null,
        lastError: r.lastError ?? null,
        lastErrorAt: r.lastErrorAt?.toISOString?.() ?? null,
        output: r.output ?? null,
        referencedThreadIds: r.referencedThreadIds ?? [],
        referencedEventIds: r.referencedEventIds ?? [],
        model: r.model ?? null,
        promptVersion: r.promptVersion ?? null,
        generatedAt: r.generatedAt?.toISOString?.() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      },
    };

    const parsed = GetWeeklySummaryDetailResponseSchema.safeParse(out);
    if (!parsed.success) {
      console.log(parsed.error);
      return jsonBadRequest('Failed to parse weekly summary detail response');
    }

    return jsonOK(parsed.data);
  }
);
