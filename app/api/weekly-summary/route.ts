import { WeeklySummarySchema } from '@/types/api/weekly-summary';
import { NextResponse } from 'next/server';

export async function GET() {
  const fakeSummary = WeeklySummarySchema.parse({
    version: 1,
    range: {
      startISO: new Date('2025-10-14').toISOString(),
      endISO: new Date('2025-10-18').toISOString(),
      label: 'Last week · Oct 14–18',
    },
    headline: 'Steady shipping, heavier-than-usual review load.',
    softStats: {
      prsAuthored: 3,
      prsReviewed: 7,
      activeDays: 4,
      mostActiveDay: 'Wed',
    },
    shipped: [
      {
        prId: '123',
        title: 'Refactor auth middleware',
        role: 'author',
        shortSummary: 'Simplified auth flow and reduced duplication.',
        tags: ['infra', 'auth'],
        number: 158,
        htmlUrl: 'https://google.com',
      },
    ],
    reviewsCollab: {
      totalReviewed: 7,
      firstResponderCount: 3,
      highlightedReview: {
        prId: '456',
        title: 'Add new billing endpoints',
        role: 'reviewer',
        shortSummary: 'Focused feedback on API consistency and error handling.',
        tags: ['api', 'architecture'],
        htmlUrl: 'https://google.com',
      },
    },
    whatYouWorkedOn: {
      textSummary: 'Most of your coding time was in infra and auth',
      focusAreas: ['infra', 'auth'],
    },
    frictionFollowups: {
      items: [
        {
          kind: 'theme',
          text: 'Most iteration this week came from test coverage feedback.',
          themeTags: ['tests'],
        },
      ],
    },
    meta: {
      generatedAt: new Date().toISOString(),
      rangeKey: 'last-week',
    },
  });

  return NextResponse.json(fakeSummary);
}
