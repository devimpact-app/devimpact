export interface PrSummaryResult {
  shortSummary: string; // 1–2 sentences, dashboard-friendly
  longSummary: string; // 3–6 sentences, more context
  highlights: string[]; // bullet points you can show in tooltips / weekly recap
  typeTags: string[]; // e.g. ["refactor", "infra", "onboarding", "performance"]
  domainTags: string[]; // e.g. ["refactor", "infra", "onboarding", "performance"]
  reviewFrictionTags: string[]; // e.g. ["refactor", "infra", "onboarding", "performance"]
}
