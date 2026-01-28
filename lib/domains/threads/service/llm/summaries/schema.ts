export const THREAD_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description:
        'Concise thread title. Should be stable across updates unless clearly improved.',
    },
    headline: {
      type: 'string',
      description:
        'One-sentence summary of the thread in a factual, engineer voice. No fluff.',
    },
    bullets: {
      type: 'array',
      minItems: 0,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['bulletId', 'text', 'referencedEventIds', 'sortIndex'],
        properties: {
          bulletId: {
            type: ['string', 'null'],
            description:
              'Existing bullet ID to update; null means create a new bullet. Must be one of the bullet IDs provided in the input when non-null.',
          },
          sortIndex: {
            type: 'integer',
            minimum: 0,
            maximum: 50,
            description:
              '0-based order of the bullet in the thread summary. Prefer contiguous indices starting at 0.',
          },
          text: {
            type: 'string',
            minLength: 1,
            maxLength: 220,
            description:
              'High-signal accomplishment bullet. Engineer-native, no fluff.',
          },
          referencedEventIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 0,
            maxItems: 20,
            description: 'ActivityEvent IDs that support this bullet.',
          },
        },
      },
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description:
        'Confidence that the title/summary accurately represent the thread.',
    },
  },
  required: ['title', 'headline', 'bullets', 'confidence'],
  additionalProperties: false,
} as const;
