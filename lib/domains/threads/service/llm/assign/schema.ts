export const THREAD_ASSIGNMENT_SCHEMA = {
  type: 'object',
  properties: {
    assignments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
          action: {
            type: 'string',
            enum: ['assign_existing', 'create_new', 'skip'],
          },
          threadId: { type: ['string', 'null'] },
          newThreadKey: { type: ['string', 'null'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          reasons: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'eventId',
          'action',
          'confidence',
          'reasons',
          'threadId',
          'newThreadKey',
        ],
        additionalProperties: false,
      },
    },

    newThreads: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          newThreadKey: { type: 'string' },
          categoryKey: {
            type: 'string',
            enum: [
              'features',
              'bugs_incidents',
              'tech_debt',
              'collaboration',
              'alignment',
              'skill_growth',
              'hiring',
            ],
          },
          title: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['newThreadKey', 'categoryKey', 'title', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['assignments', 'newThreads'],
  additionalProperties: false,
} as const;
