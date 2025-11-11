export const AiConfig = {
  models: {
    summarize: "gpt-5-mini", // fast & cheap; upgrade to "gpt-5" if needed
    themes: "gpt-5-mini",
    // quarterly: "claude-4.5-sonnet",
    // embed: "text-embedding-3-large",
  },
  json: { response_format: { type: "json_object" } as const },
  // soft caps to avoid runaway costs in jobs:
  limits: { maxPerRunUsd: 1.5, maxPerDayUsd: 20 },
};
