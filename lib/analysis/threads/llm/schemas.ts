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
          // Required if action === 'assign_existing'
          threadId: { type: 'string' },
          // Required if action === 'create_new'
          newThreadKey: { type: 'string' },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
          reasons: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['eventId', 'action', 'confidence', 'reasons'],
        additionalProperties: false,
        allOf: [
          {
            if: {
              properties: { action: { const: 'assign_existing' } },
            },
            then: {
              required: ['threadId'],
            },
          },
          {
            if: {
              properties: { action: { const: 'create_new' } },
            },
            then: {
              required: ['newThreadKey'],
            },
          },
        ],
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
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
        },
        required: ['newThreadKey', 'categoryKey', 'title', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['assignments', 'newThreads'],
  additionalProperties: false,
} as const;
