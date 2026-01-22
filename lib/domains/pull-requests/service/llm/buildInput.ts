import {
  GithubPRFile,
  GithubReviewComment,
  PullRequest,
  Review,
} from '@/lib/db/schema';
import { PRSummarizationInput } from './types';

function clip(s: string | null | undefined, max = 500) {
  const t = (s ?? '').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

export function buildPRSummarizationInput(args: {
  normPr: PullRequest;
  files: GithubPRFile[];
  reviews: Review[];
  reviewComments: GithubReviewComment[];
}): PRSummarizationInput {
  const { normPr, files, reviews, reviewComments } = args;

  const metrics: PRSummarizationInput['metrics'] = {
    filesChanged: normPr.filesChanged ?? 0,
    additions: normPr.linesAdded ?? 0,
    deletions: normPr.linesDeleted ?? 0,
    reviewRounds: normPr.reviewRounds ?? 0,
  };

  const timeline: PRSummarizationInput['timeline'] = {
    leadTimeSeconds: normPr.leadTimeSeconds ?? null,
  };

  const totalFiles = files.length;
  const byExtMap = new Map<
    string,
    { extension: string; files: number; linesChanged: number }
  >();

  for (const f of files) {
    const ext = f.fileExtension;
    const key = ext || '(no-ext)';
    const entry = byExtMap.get(key) ?? {
      extension: key,
      files: 0,
      linesChanged: 0,
    };
    entry.files += 1;
    entry.linesChanged += f.additions + f.deletions;
    byExtMap.set(key, entry);
  }

  const fileSummary = {
    totalFiles,
    byExtension: Array.from(byExtMap.values()).sort(
      (a, b) => b.linesChanged - a.linesChanged
    ),
  };

  // top files (by lines changed)
  const topFiles = [...files]
    .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
    .slice(0, 8)
    .map((f) => ({
      path: f.filename,
      extension: f.fileExtension,
      additions: f.additions,
      deletions: f.deletions,
    }));

  // Find first blocking review (earliest submittedAt where isBlockingReview = true)
  const blockingReviews = reviews
    .filter((r) => r.isBlockingReview && r.submittedAt)
    .sort(
      (a, b) =>
        (a.submittedAt!.getTime() ?? 0) - (b.submittedAt!.getTime() ?? 0)
    );

  let firstBlockingReview: PRSummarizationInput['firstBlockingReview'] | null =
    null;

  if (blockingReviews.length > 0) {
    const first = blockingReviews[0];

    const topInlineComments = reviewComments
      .filter((c) => c.reviewId === first.githubReviewId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, 3)
      .map((c) => ({
        createdAt: c.createdAt,
        body: clip(c.body, 400),
      }));

    firstBlockingReview = {
      reviewerLogin: first.reviewerLogin,
      submittedAt: first.submittedAt!,
      state: first.state as 'commented' | 'changes_requested',
      body: clip(first.body, 700),
      ...(topInlineComments.length ? { topInlineComments } : {}),
    };
  }

  const notableComments: PRSummarizationInput['notableComments'] =
    reviewComments
      .filter((c) => (c.body?.trim()?.length ?? 0) >= 50)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, 6)
      .map((c) => ({
        authorLogin: c.authorGithubLogin,
        createdAt: c.createdAt,
        body: clip(c.body, 400),
        kind: 'inline_comment' as const,
      }));

  const prInfo: PRSummarizationInput['pr'] = {
    repoFullName: normPr.repoFullName,
    prNumber: normPr.prNumber,
    htmlUrl: normPr.htmlUrl ?? '',
    updatedAt: normPr.sourceUpdatedAt,
    state: normPr.state,
    createdAt: normPr.createdAt,
    mergedAt: normPr.mergedAt,
    authorLogin: normPr.prAuthorLogin,
    title: normPr.title,
    body: normPr.body ?? '',
  };

  return {
    pr: prInfo,
    metrics,
    timeline,
    topFiles,
    fileSummary,
    firstBlockingReview,
    notableComments,
    context: {
      perspective: normPr.authorIsTenant ? 'author' : 'reviewer',
    },
  };
}
