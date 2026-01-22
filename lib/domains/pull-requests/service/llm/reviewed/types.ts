export interface PRReviewedSummarizationInput {
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
  myFirstBlockingReview: {
    submittedAt: Date;
    state: 'commented' | 'changes_requested';
    body: string;
    comments: {
      createdAt: Date;
      body: string;
    }[];
  } | null;
  myReviews: {
    submittedAt: Date | null;
    state: string;
    body: string;
    isBlocking: boolean;
    reviewCommentsCount: number;
  }[];
  myReviewStats: {
    reviewsCount: number;
    reviewCommentsCount: number;
    approvalsCount: number;
    blockingReviewCount: number;
  };
  context: {
    perspective: 'reviewer';
    reviewerLogin: string;
  };
}

export interface PrReviewedSummaryResult {
  shortSummary: string; // 1–2 sentences, dashboard-friendly
  longSummary: string; // 3–6 sentences, more context
  highlights: string[]; // bullet points you can show in tooltips / weekly recap
  typeTags: string[]; // e.g. ["refactor", "infra", "onboarding", "performance"]
  domainTags: string[]; // e.g. ["refactor", "infra", "onboarding", "performance"]
}
