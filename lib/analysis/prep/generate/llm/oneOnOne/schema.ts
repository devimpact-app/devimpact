export const ONE_ON_ONE_SCHEMA = {
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
            enum: [
              'highlights',
              'friction',
              'asks',
              'collaboration',
              'growth',
              'focus_areas',
              'goals',
            ],
          },
          title: { type: 'string' },
          body: { type: 'string' },
          order: { type: 'integer' },
          relatedInsightIds: { type: 'array', items: { type: 'string' } },
          relatedMetricIds: { type: 'array', items: { type: 'string' } },
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
          'relatedInsightIds',
          'relatedMetricIds',
          'relatedPrIds',
          'relatedReviewIds',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['talkingPoints'],
  additionalProperties: false,
} as const;
