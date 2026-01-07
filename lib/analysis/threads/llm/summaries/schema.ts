export const THREAD_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description:
        'Concise thread title. Should be stable across updates unless clearly improved.',
    },
    summary: {
      type: 'string',
      description:
        'A compact, high-signal summary of the thread. Should read like an engineer wrote it. Avoid fluff.',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description:
        'Confidence that the title/summary accurately represent the thread.',
    },
    reasons: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Short reasons for why these events belong together / why this summary is shaped this way.',
    },

    updates: {
      type: ['object', 'null'],
      properties: {
        headline: { type: ['string', 'null'] },
        bullets: {
          type: ['array', 'null'],
          items: { type: 'string' },
        },
        referencedEventIds: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['headline', 'bullets', 'referencedEventIds'],
      additionalProperties: false,
    },
  },
  required: ['title', 'summary', 'confidence', 'reasons', 'updates'],
  additionalProperties: false,
} as const;
