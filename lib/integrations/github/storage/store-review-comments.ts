import { db } from "@/lib/db/client";
import { githubReviewComments, githubReviews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { GitHubReviewComment } from "../api/types";

export async function storeReviewComments(
  prId: string,
  userId: string,
  comments: GitHubReviewComment[],
  username: string,
): Promise<void> {
  if (comments.length === 0) return;

  // Process each comment and link to review if possible
  const commentValues = await Promise.all(
    comments.map(async (c) => {
      // Find our internal review ID from GitHub's review ID
      let reviewDbId = null;

      if (c.pull_request_review_id) {
        const [review] = await db
          .select({ id: githubReviews.id })
          .from(githubReviews)
          .where(eq(githubReviews.reviewId, String(c.pull_request_review_id)))
          .limit(1);

        reviewDbId = review?.id || null;
      }

      return {
        prId,
        reviewId: reviewDbId,
        userId,
        commentId: String(c.id),
        pullRequestReviewId: c.pull_request_review_id
          ? String(c.pull_request_review_id)
          : null,
        body: c.body,
        path: c.path,
        line: c.line || null,
        startLine: c.start_line || null,
        side: c.side || null,
        githubLogin: username,
        authorAssociation: c.author_association || null,
        inReplyToId: c.in_reply_to_id ? String(c.in_reply_to_id) : null,
        commitId: c.commit_id,
        diffHunk: c.diff_hunk || null, // Optional: can skip if too large
        createdAt: new Date(c.created_at),
        updatedAt: c.updated_at ? new Date(c.updated_at) : null,
        htmlUrl: c.html_url,
      };
    }),
  );

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
    });
}
