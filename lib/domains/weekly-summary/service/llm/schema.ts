export const WEEKLY_SUMMARY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'bullets', 'confidence'],
  properties: {
    headline: {
      type: 'string',
      minLength: 1,
      maxLength: 220,
      description:
        'One-sentence weekly summary in an engineer voice. High-signal, factual, no fluff.',
    },

    bullets: {
      type: 'array',
      minItems: 0,
      maxItems: 12,
      description:
        '3–8 bullets preferred. Each bullet should be a distinct highlight from the week.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'referencedThreadIds', 'referencedEventIds'],
        properties: {
          text: {
            type: 'string',
            minLength: 1,
            maxLength: 240,
            description:
              'Weekly highlight bullet. Concise, specific, engineer-native. No hype.',
          },

          referencedThreadIds: {
            type: 'array',
            minItems: 0,
            maxItems: 10,
            items: {
              type: 'string',
              description:
                'Thread UUID that supports this bullet (must come from provided threads list).',
            },
            description:
              'Thread IDs that support this bullet. Use when the bullet summarizes thread-level work.',
          },

          referencedEventIds: {
            type: 'array',
            minItems: 0,
            maxItems: 30,
            items: {
              type: 'string',
              description:
                'ActivityEvent UUID that supports this bullet (must come from provided events list).',
            },
            description:
              'ActivityEvent IDs that support this bullet. Use when the bullet references specific events.',
          },
        },
      },
    },

    confidence: {
      type: ['number', 'null'],
      minimum: 0,
      maximum: 1,
      description:
        'Confidence that the weekly summary reflects the provided evidence (threads/events). Null if unsure.',
    },
  },
} as const;
