import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'; // adjust import if you're using the new API

export interface PRSummarizationInput {
  pr: {
    repoFullName: string;
    prNumber: number;
    htmlUrl: string;
    state: string;
    createdAt: Date;
    updatedAt: Date | null;
    mergedAt: Date | null;
    closedAt: Date | null;
    authorLogin: string;
    title: string;
    body: string;
  };
  metrics: {
    linesChangedTotal: number;
    filesChanged: number;
    additions: number;
    deletions: number;
    reviewCount: number;
    approvalCount: number;
    commentCount: number;
    reviewRounds: number;
    blockingReviewCount: number;
  };
  timeline: {
    timeToFirstReviewSeconds: number | null;
    reviewToMergeSeconds: number | null;
    leadTimeSeconds: number | null;
    timeToFirstApprovalSeconds: number | null;
  };
  topFiles: {
    path: string;
    extension: string;
    additions: number;
    deletions: number;
  }[];
  fileSummary: {
    totalFiles: number;
    byExtension: Array<{
      extension: string;
      files: number;
      linesChanged: number;
    }>;
  };
  firstBlockingReview: {
    reviewerLogin: string;
    submittedAt: Date;
    state: 'commented' | 'changes_requested';
    body: string;
    comments: {
      createdAt: Date;
      body: string;
    }[];
  } | null;
  reviews: {
    reviewerLogin: string;
    submittedAt: Date | null;
    state: string;
    body: string;
    isBlocking: boolean;
    reviewCommentsCount: number;
  }[];
  reviewComments: {
    reviewerLogin: string;
    createdAt: Date;
    body: string;
  }[];
  context?: {
    perspective: 'author' | 'reviewer';
  };
}

const PR_TYPE_VOCAB = [
  'feature',
  'bugfix',
  'refactor',
  'devex_or_infra',
  'tests_or_quality',
  'docs_or_config',
];

const PR_DOMAIN_VOCAB = [
  'frontend',
  'backend',
  'data_pipeline',
  'infra_devops',
  'tests',
  'docs',
  'shared_lib_or_core',
];

export const REVIEW_TAG_VOCAB = [
  'readability_or_clarity',
  'architecture_or_design',
  'logic_or_correctness',
  'testing_requirements',
  'oversized_or_scope',
  'style_nits',
];

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
      'Output strictly as a compact JSON object with keys:',
      '  shortSummary, longSummary, highlights, typeTags, domainTags, reviewFrictionTags.',
      'Do not include any extra commentary or markdown.',
    ].join('\n'),
  };

  const typeTagList = PR_TYPE_VOCAB.join(', ');
  const domainTagList = PR_DOMAIN_VOCAB.join(', ');
  const reviewFrictionTagList = REVIEW_TAG_VOCAB.join(', ');

  const user: ChatCompletionMessageParam = {
    role: 'user',
    content: [
      'Here is structured metadata about a single pull request.',
      'Use it to produce a concise but meaningful summary for the engineer who authored it.',
      '',
      'PR data (JSON):',
      JSON.stringify(input, null, 2),
      '',
      'Output format:',
      'Return a single JSON object with the following shape:',
      '{',
      '  "shortSummary": string,',
      '  "longSummary": string,',
      '  "highlights": string[],',
      '  "typeTags": string[],',
      '  "domainTags": string[],',
      '  "reviewFrictionTags": string[]',
      '}',
      '',
      'Field requirements:',
      '- shortSummary: 1–2 sentences describing what this PR accomplished in plain, grounded language.',
      '- longSummary: 3–6 sentences giving a bit more context: what changed, why, and any notable review or iteration patterns.',
      '- highlights: 3–6 short, factual highlight lines (no bullet characters). Prioritize impact, scope, collaboration, or changes over time. Each highlight should stand alone as a fragment or short sentence.',
      '',
      '- typeTags: 2–4 short lowercase tags describing the nature of the work. You MUST choose only from the allowed type tag list below.',
      '- domainTags: 1–3 tags describing where the work happened in the stack. You MUST choose only from the allowed domain tag list below.',
      '- reviewFrictionTags: 0–4 tags describing WHY the *first blocking review* pushed back on this PR. You MUST choose only from the allowed review friction tag list below.',
      '',
      'Allowed typeTags (choose only from this list, do not invent new ones):',
      typeTagList,
      '',
      'Allowed domainTags (choose only from this list, do not invent new ones):',
      domainTagList,
      '',
      'Allowed reviewFrictionTags (choose only from this list, do not invent new ones):',
      reviewFrictionTagList,
      '',
      'Definitions:',
      '- "First blocking review" means the first review that did NOT approve the PR and clearly requested changes or raised concerns (state CHANGES_REQUESTED, or COMMENTED where the tone/body asks for fixes before merge).',
      '- If there was no blocking review (e.g., only APPROVED reviews or trivial comments), then reviewFrictionTags should be an empty array [].',
      '',
      'Tag guidelines:',
      '- typeTags should describe what kind of work this was (e.g., features vs bugfixes vs refactors).',
      '- domainTags should reflect the main areas of the codebase touched (e.g., frontend vs backend vs infra).',
      '- reviewFrictionTags should summarize the main themes of the feedback from the first blocking review only. Leave empty if no blocking review',
      '- It is OK to pick multiple tags when they clearly apply, but avoid over-tagging.',
      '- Do NOT create new tag words or synonyms. If none fit perfectly, choose the closest reasonable tags from the allowed lists.',
      '',
      'Interpretation guidelines:',
      '- Metrics fields represent aggregate information about the PR, not code content.',
      '- Review and comment bodies may contain code suggestions; do NOT include code snippets in the summaries.',
      "- Use file information only to infer approximate scope (for example, 'touches frontend components'); do not guess implementation details.",
      '- Time-related fields provide context only; mention delays neutrally if they matter.',
      '- When inferring domainTags, rely primarily on file extensions and directories.',
      '- When inferring reviewFrictionTags, focus on the first blocking review body and any associated review comments near that time.',
      '',
      'If the PR is small, keep everything tight and avoid overstating impact.',
      'If timelines show multiple review rounds, it is fine to mention that neutrally in longSummary or highlights.',
    ].join('\n'),
  };

  return [system, user];
}
