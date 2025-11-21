export const AiConfig = {
  models: {
    summarize: 'gpt-4o-mini', // fast & cheap; upgrade to "gpt-5" if needed
    themes: 'gpt-4o-mini',
    // quarterly: "claude-4.5-sonnet",
    // embed: "text-embedding-3-large",
  },
  json: {
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'pr_summary',
        schema: {
          type: 'object',
          properties: {
            shortSummary: { type: 'string' },
            longSummary: { type: 'string' },
            highlights: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['shortSummary', 'longSummary', 'highlights', 'tags'],
          additionalProperties: false,
        },
      },
    },
  },
  // soft caps to avoid runaway costs in jobs:
  limits: { maxPerRunUsd: 1.5, maxPerDayUsd: 20 },
};
