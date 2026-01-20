export const AUTHORED_PR_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    shortSummary: { type: 'string' },
    longSummary: { type: 'string' },
    highlights: { type: 'array', items: { type: 'string' } },
    typeTags: { type: 'array', items: { type: 'string' } },
    domainTags: { type: 'array', items: { type: 'string' } },
    reviewFrictionTags: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'shortSummary',
    'longSummary',
    'highlights',
    'typeTags',
    'domainTags',
  ],
  additionalProperties: false,
};
