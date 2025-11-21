import {
  GithubPR,
  GithubPRFile,
  GithubReview,
  GithubReviewComment,
  PullRequest,
} from '@/lib/db/schema'
import { PRSummarizationInput } from '../prompts/prSummary'

export function buildPRSummarizationInput(args: {
  normPr: PullRequest
  files: GithubPRFile[]
  reviews: GithubReview[]
  reviewComments: GithubReviewComment[]
}): PRSummarizationInput {
  const { normPr, files, reviews, reviewComments } = args

  const metrics = {
    linesChangedTotal: normPr.linesChanged ?? 0,
    filesChanged: normPr.filesChanged ?? 0,
    additions: normPr.linesAdded ?? 0,
    deletions: normPr.linesDeleted ?? 0,
    reviewCount: normPr.reviewsCount ?? 0,
    approvalCount: normPr.approvalsCount ?? 0,
    commentCount: normPr.reviewCommentsCount ?? 0,
    reviewRounds: normPr.reviewRounds ?? 0,
  }

  const timeline = {
    timeToFirstReviewSeconds: normPr.timeToFirstReviewSeconds ?? null,
    reviewToMergeSeconds: normPr.reviewToMergeSeconds ?? null,
    leadTimeSeconds: normPr.leadTimeSeconds ?? null,
    timeToFirstApprovalSeconds: normPr.timeToFirstApprovalSeconds ?? null,
  }

  const totalFiles = files.length
  const byExtMap = new Map<
    string,
    { extension: string; files: number; linesChanged: number }
  >()

  for (const f of files) {
    const ext = f.fileExtension
    const key = ext || '(no-ext)'
    const entry = byExtMap.get(key) ?? {
      extension: key,
      files: 0,
      linesChanged: 0,
    }
    entry.files += 1
    entry.linesChanged += f.additions + f.deletions
    byExtMap.set(key, entry)
  }

  const fileSummary = {
    totalFiles,
    byExtension: Array.from(byExtMap.values()).sort(
      (a, b) => b.linesChanged - a.linesChanged
    ),
  }

  // top files (by lines changed)
  const topFiles = [...files]
    .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
    .slice(0, 8)
    .map((f) => ({
      path: f.filename,
      extension: f.fileExtension,
      additions: f.additions,
      deletions: f.deletions,
    }))

  const reviewsOut: PRSummarizationInput['reviews'] = reviews.map((r) => ({
    reviewerLogin: r.reviewerGithubLogin,
    submittedAt: r.submittedAt,
    state: r.state,
    body: r.body ?? '',
  }))

  const reviewCommentsOut: PRSummarizationInput['reviewComments'] =
    reviewComments.map((c) => ({
      reviewerLogin: c.authorGithubLogin,
      createdAt: c.createdAt,
      body: c.body,
    }))

  const prInfo: PRSummarizationInput['pr'] = {
    repoFullName: normPr.repoFullName,
    prNumber: normPr.prNumber,
    htmlUrl: normPr.htmlUrl ?? '',
    state: normPr.state,
    createdAt: normPr.createdAt,
    updatedAt: normPr.sourceUpdatedAt,
    mergedAt: normPr.mergedAt,
    closedAt: normPr.closedAt,
    authorLogin: normPr.prAuthorLogin,
    title: normPr.title,
    body: normPr.body ?? '',
  }

  return {
    pr: prInfo,
    metrics,
    timeline,
    topFiles,
    fileSummary,
    reviews: reviewsOut,
    reviewComments: reviewCommentsOut,
    context: {
      perspective: normPr.authorIsTenant ? 'author' : 'reviewer',
    },
  }
}
