export interface PRSummarizationInput {
  pr: {
    repoFullName: string;
    prNumber: number;
    htmlUrl: string;
    state: string;
    createdAt: Date;
    updatedAt: Date;
    mergedAt: Date | null;
    authorLogin: string;
    title: string;
    body: string;
  };
  metrics: {
    filesChanged: number;
    additions: number;
    deletions: number;
    reviewRounds: number;
  };
  timeline: {
    leadTimeSeconds: number | null;
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
    topInlineComments?: { createdAt: Date; body: string }[];
  } | null;
  notableComments: {
    authorLogin: string;
    createdAt: Date;
    body: string;
    kind?: 'review' | 'inline_comment';
    state?: 'commented' | 'changes_requested' | 'approved';
  }[];
  context?: {
    perspective: 'author' | 'reviewer';
  };
}

export const PR_TYPE_VOCAB = [
  'feature',
  'bugfix',
  'refactor',
  'devex_or_infra',
  'tests_or_quality',
  'docs_or_config',
];

export const PR_TYPE_LABELS: Record<(typeof PR_TYPE_VOCAB)[number], string> = {
  feature: 'Features',
  bugfix: 'Bug fixes',
  refactor: 'Refactors',
  devex_or_infra: 'DevEx / Infrastructure',
  tests_or_quality: 'Tests / Quality',
  docs_or_config: 'Docs / Configuration',
};

export const PR_DOMAIN_VOCAB = [
  'frontend',
  'backend',
  'data_pipeline',
  'infra_devops',
  'tests',
  'docs',
  'shared_lib_or_core',
];

export const PR_DOMAIN_LABELS: Record<
  (typeof PR_DOMAIN_VOCAB)[number],
  string
> = {
  frontend: 'Frontend',
  backend: 'Backend',
  data_pipeline: 'Data pipeline',
  infra_devops: 'Infrastructure / DevOps',
  tests: 'Tests',
  docs: 'Documentation',
  shared_lib_or_core: 'Shared libraries / Core systems',
};

export const REVIEW_TAG_VOCAB = [
  'readability_or_clarity',
  'architecture_or_design',
  'logic_or_correctness',
  'testing_requirements',
  'oversized_or_scope',
  'style_nits',
];

export interface PrSummaryResult {
  shortSummary: string; // 1–2 sentences, dashboard-friendly
  longSummary: string; // 3–6 sentences, more context
  highlights: string[]; // bullet points you can show in tooltips / weekly recap
  typeTags: string[]; // e.g. ["refactor", "infra", "onboarding", "performance"]
  domainTags: string[]; // e.g. ["refactor", "infra", "onboarding", "performance"]
}
