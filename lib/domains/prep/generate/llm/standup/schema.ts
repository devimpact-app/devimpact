export const STANDUP_SCHEMA = {
  type: 'object',
  properties: {
    talkingPoints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          kind: {
            type: 'string',
            enum: ['yesterday', 'today', 'blockers'],
          },
          title: { type: 'string' },
          body: { type: 'string' },
          order: { type: 'integer' },
          relatedSignalIds: { type: 'array', items: { type: 'string' } },
          relatedPrIds: { type: 'array', items: { type: 'string' } },
          relatedReviewIds: { type: 'array', items: { type: 'string' } },
          relatedCalendarEventIds: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'id',
          'kind',
          'title',
          'body',
          'order',
          'relatedSignalIds',
          'relatedPrIds',
          'relatedCalendarEventIds',
          'relatedReviewIds',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['talkingPoints'],
  additionalProperties: false,
} as const;
