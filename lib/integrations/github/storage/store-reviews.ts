import { db } from "@/lib/db/client";
import { githubReviews } from "@/lib/db/schema";
import { GitHubReview } from "../api/types";
import { sql } from "drizzle-orm";

export async function storeReviews(
  prId: string,
  userId: string,
  reviews: GitHubReview[],
  username: string,
): Promise<void> {
  if (reviews.length === 0) return;

  await db
    .insert(githubReviews)
    .values(
      reviews.map((r) => ({
        prId,
        userId,
        reviewId: r.id, // GitHub's review ID (for linking review comments)
        state: r.state,
        body: r.body || null,
        githubLogin: username,
        commitId: r.commit_id || null,
        authorAssociation: r.author_association || null,
        submittedAt: r.submitted_at ? new Date(r.submitted_at) : null,
        htmlUrl: r.html_url,
      })),
    )
    .onConflictDoUpdate({
      target: [githubReviews.reviewId],
      set: {
        state: sql`excluded.state`,
        body: sql`excluded.body`,
        submittedAt: sql`excluded.submitted_at`,
        fetchedAt: new Date(),
      },
    });
}
