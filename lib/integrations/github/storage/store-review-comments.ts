import { db } from '@/lib/db/client'
import { githubReviewComments, githubReviews } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { SanitizedPRReviewComment } from '../types'

export async function storeReviewComments(
  prId: string,
  userId: string,
  comments: SanitizedPRReviewComment[]
): Promise<void> {
  if (comments.length === 0) return

  // Process each comment and link to review if possible
  const commentValues = await Promise.all(
    comments.map(async (c) => {
      // Find our internal review ID from GitHub's review ID
      let reviewDbId = null

      if (c.pull_request_review_id) {
        const [review] = await db
          .select({ id: githubReviews.id })
          .from(githubReviews)
          .where(eq(githubReviews.reviewId, String(c.pull_request_review_id)))
          .limit(1)

        reviewDbId = review?.id || null
      }

      return {
        prId,
        reviewId: reviewDbId,
        tenantId: userId,
        commentId: String(c.id),
        pullRequestReviewId: c.pull_request_review_id
          ? String(c.pull_request_review_id)
          : null,
        body: c.body,
        path: c.path,
        authorGithubLogin: c.user.login,
        inReplyToId: c.in_reply_to_id ? String(c.in_reply_to_id) : null,
        createdAt: new Date(c.created_at),
        updatedAt: c.updated_at ? new Date(c.updated_at) : null,
        htmlUrl: c.html_url,
      }
    })
  )

  await db
    .insert(githubReviewComments)
    .values(commentValues)
    .onConflictDoUpdate({
      target: [githubReviewComments.commentId],
      set: {
        body: sql`excluded.body`,
        updatedAt: sql`excluded.updated_at`,
        fetchedAt: new Date(),
      },
    })
}
