import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions' // adjust import if you're using the new API

export interface PRSummarizationInput {
  pr: {
    repoFullName: string
    prNumber: number
    htmlUrl: string
    state: string
    createdAt: Date
    updatedAt: Date | null
    mergedAt: Date | null
    closedAt: Date | null
    authorLogin: string
    title: string
    body: string
  }
  metrics: {
    linesChangedTotal: number
    filesChanged: number
    additions: number
    deletions: number
    reviewCount: number
    approvalCount: number
    commentCount: number
    reviewRounds: number
  }
  timeline: {
    timeToFirstReviewSeconds: number | null
    reviewToMergeSeconds: number | null
    leadTimeSeconds: number | null
    timeToFirstApprovalSeconds: number | null
  }
  topFiles: {
    path: string
    extension: string
    additions: number
    deletions: number
  }[]
  fileSummary: {
    totalFiles: number
    byExtension: Array<{
      extension: string
      files: number
      linesChanged: number
    }>
  }
  reviews: {
    reviewerLogin: string
    submittedAt: Date | null
    state: string
    body: string
  }[]
  reviewComments: {
    reviewerLogin: string
    createdAt: Date
    body: string
  }[]
  context?: {
    perspective: 'author' | 'reviewer'
  }
}

export function buildPrSummaryMessages(
  input: PRSummarizationInput
): ChatCompletionMessageParam[] {
  const system: ChatCompletionMessageParam = {
    role: 'system',
    content: [
      'You are an assistant that summarizes GitHub pull requests for a single engineer.',
      'Your goal is to turn raw PR and review metadata into concise, human, non-buzzwordy summaries.',
      '',
      'Constraints:',
      "- Be concrete and specific; avoid generic phrases like 'various improvements' or 'general refactors'.",
      "- Do not invent code details that aren't implied by the input.",
      '- Focus on what changed and why it mattered, not process ceremony.',
      '- Keep tone neutral and professional, not salesy.',
      '',
      'Output strictly as a compact JSON object with keys: shortSummary, longSummary, highlights, tags.',
      'Do not include any extra commentary or markdown.',
    ].join('\n'),
  }

  const user: ChatCompletionMessageParam = {
    role: 'user',
    content: [
      'Here is structured metadata about a single pull request. ',
      'Use it to produce a concise but meaningful summary for the engineer who authored it.',
      '',
      'PR data (JSON):',
      JSON.stringify(input, null, 2),
      '',
      'Instructions:',
      '- shortSummary: 1–2 sentences describing what this PR accomplished in plain, grounded language.',
      '- longSummary: 3–6 sentences giving a bit more context: what changed, why, and any notable review or iteration patterns.',
      '- highlights: 3–6 short, factual highlight lines (no bullet characters). Prioritize impact, scope, collaboration, or changes over time.',
      "- tags: 3–6 short lowercase tags like 'infra', 'refactor', 'product', 'bugfix', 'performance', 'devex'.",
      '',
      'Interpretation guidelines:',
      '- Metrics fields represent aggregate information about the PR, not code content.',
      '- Review and comment bodies may contain code suggestions; do NOT include code snippets in the summaries.',
      "- Use file information only to infer approximate scope (e.g., 'touches frontend components'); do not guess implementation details.",
      '- Time-related fields provide context only; mention delays neutrally if they matter.',
      '',
      'If the PR is small, keep everything tight and avoid overstating impact.',
      "If timelines show multiple review rounds, it's fine to mention that neutrally.",
    ].join('\n'),
  }

  return [system, user]
}
