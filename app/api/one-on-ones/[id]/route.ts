import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { withSentryUser } from '@/lib/withSentryUser';
import { db } from '@/lib/db/client';
import { oneOnOneSessions } from '@/lib/db/schema';
import { OneOnOneResponse } from '@/types/api/one-on-one';
import {
  jsonBadRequest,
  jsonNotFound,
  jsonOK,
  jsonUnauthorized,
} from '../../_lib/http';

export const GET = withSentryUser(
  async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

    const userId = session.user.id;
    const params = await context.params;
    const id = params.id;

    if (!id) {
      return jsonBadRequest('Missing one-on-one id');
    }

    const [row] = await db
      .select()
      .from(oneOnOneSessions)
      .where(
        and(eq(oneOnOneSessions.id, id), eq(oneOnOneSessions.tenantId, userId))
      )
      .limit(1);

    if (!row) {
      return jsonNotFound('One-on-one not found');
    }

    const { payload: badPayload, ...rowProps } = row;

    const payload = {
      // summary: `1:1 prep for ${rowP} covering ${mediumStart}–${mediumEnd}. Focus on delivery, code health, and current blockers.`,
      summary: '',
      talkingPoints: [
        {
          id: 'tp-1',
          kind: 'highlights',
          title: 'Auth refactor PR',
          body: 'Closed out the lingering auth cleanup PR (#4821) that had been stalled for two weeks. Reduced ~600 lines of dead code.',
          order: 1,
          relatedInsightIds: ['shipping_momentum:last_4_weeks'],
          relatedMetricIds: ['prs_merged:last_4_weeks'],
        },
        {
          id: 'tp-2',
          kind: 'highlights',
          title: 'Billing settings UI',
          body: 'Delivered the initial settings panel. Minimal scope but unblocked design and helped backend validate API shape.',
          order: 2,
          relatedInsightIds: [],
          relatedMetricIds: ['prs_merged:last_4_weeks'],
        },
        {
          id: 'tp-3',
          kind: 'friction',
          title: 'Slow review turnaround',
          body: 'The two PRs for notifications batching sat 4–5 days waiting for review, causing some context switching.',
          order: 3,
          relatedInsightIds: ['shipping_momentum:last_4_weeks'],
          relatedMetricIds: ['prs_merged:last_4_weeks'],
        },
        {
          id: 'tp-4',
          kind: 'friction',
          title: 'Recurring setup issues',
          body: 'Spent multiple hours reinstalling local dependencies after the Node 20 upgrade. Seems to affect others too.',
          order: 4,
          relatedInsightIds: [],
          relatedMetricIds: [],
        },
        {
          id: 'tp-5',
          kind: 'goals',
          title: 'Time spent on small reactive fixes',
          body: 'Last sprint had 12+ minor fixes that broke flow. Would be helpful to batch or defer some of that work.',
          order: 5,
          relatedInsightIds: ['shipping_momentum:last_4_weeks'],
          relatedMetricIds: [],
        },
        {
          id: 'tp-6',
          kind: 'goals',
          title: 'Clarity in initial PR descriptions',
          body: 'A couple of reviewers mentioned needing more context. Small tweaks could help reduce review cycles.',
          order: 6,
          relatedInsightIds: [],
          relatedMetricIds: ['prs_merged:last_4_weeks'],
        },
      ],

      usedInsights: [
        {
          id: 'shipping_momentum:last_4_weeks',
          kind: 'fast_loops',
          title: 'Shipping momentum is trending up over the last 4 weeks',
          body: 'They merged more PRs than their recent baseline with fewer reverts, which signals improving consistency.',
          emphasis: 'Upward trend in shipped work',
          stats: [],
          severity: 'positive',
          score: 70,
          timeWindowLabel: 'Last 4 weeks',
          meta: { source: 'stub' },
          relatedItems: [],
        },
      ],

      usedMetrics: [
        {
          id: 'prs_merged:last_4_weeks',
          label: 'PRs merged',
          unit: 'PRs',
          windowStart: rowProps.mediumWindowStart.toISOString(),
          windowEnd: rowProps.mediumWindowEnd.toISOString(),
          value: 24,
          formattedValue: '24 PRs merged',
        },
      ],
    };

    const parsedResponse = OneOnOneResponse.safeParse({
      prep: {
        ...rowProps,
        createdAt: rowProps.createdAt.toISOString(),
        updatedAt: rowProps.updatedAt.toISOString(),
        meetingAt: rowProps.meetingAt.toISOString(),
        shortWindowStart: rowProps.shortWindowStart.toISOString(),
        shortWindowEnd: rowProps.shortWindowEnd.toISOString(),
        mediumWindowStart: rowProps.mediumWindowStart.toISOString(),
        mediumWindowEnd: rowProps.mediumWindowEnd.toISOString(),
        talkingPoints: payload.talkingPoints,
        usedInsights: payload.usedInsights,
        usedMetrics: payload.usedMetrics,
        counterpartLabel: rowProps.counterpartLabel ?? undefined,
      },
    });

    if (!parsedResponse.success) {
      return jsonBadRequest('Failed to parse one-on-one response');
    }

    return jsonOK(parsedResponse.data);
  }
);
