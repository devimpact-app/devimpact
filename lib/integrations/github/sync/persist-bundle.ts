import { storePR } from "../storage/store-pr";
import { storePRFiles } from "../storage/store-pr-files";
import { storePRCommits } from "../storage/store-pr-commits";
import { storeReviews } from "../storage/store-reviews";
import { storeReviewComments } from "../storage/store-review-comments";
import { storeTimelineEvents } from "../storage/store-timeline-events";
import { storeRawData } from "../storage/store-raw-data";
import { RepoSyncPayload } from "@/types/api/sync";

export async function persistBundles(
  userId: string,
  repo: { fullName: string; owner: string; name: string },
  bundles: RepoSyncPayload["pulls"],
  opts?: {
    saveRaw?: boolean;
  },
) {
  const saveRaw = opts?.saveRaw ?? true;

  const counts = {
    prs: 0,
    files: 0,
    commits: 0,
    reviews: 0,
    reviewComments: 0,
    events: 0,
  };
  const errors: string[] = [];
  const prIds: string[] = [];

  for (const b of bundles) {
    try {
      // Optional: raw snapshot for transparency/debugging
      if (saveRaw) {
        await storeRawData(userId, repo.fullName, b.pr.number, {
          pr: b.pr,
          files: b.files ?? [],
          commits: b.commits ?? [],
          reviews: b.reviews ?? [],
          reviewComments: b.reviewComments ?? [],
          timeline: b.timelineEvents ?? [],
        });
      }

      // PR first → get internal prId
      const prId = await storePR(userId, b.pr, repo.fullName);
      prIds.push(prId);

      // Files
      if (b.files?.length) {
        const authorLogin = b.pr.user?.login ?? "unknown";
        await storePRFiles(prId, userId, b.files, authorLogin);
        counts.files += b.files.length;
      }

      // Commits
      if (b.commits?.length) {
        const authorLogin = b.pr.user?.login ?? "unknown";
        await storePRCommits(prId, userId, b.commits, authorLogin);
        counts.commits += b.commits.length;
      }

      // Reviews (optionally filter to the reviewing user)
      const reviews = b.reviews ?? [];
      if (reviews.length) {
        const reviewer = b.pr.user?.login ?? "unknown";
        await storeReviews(prId, userId, reviews, reviewer);
        counts.reviews += reviews.length;
      }

      // Review comments (match optional filter)
      const reviewComments = b.reviewComments || [];
      if (reviewComments.length) {
        await storeReviewComments(prId, userId, reviewComments);
        counts.reviewComments += reviewComments.length;
      }

      // Timeline (immutable; your storeTimelineEvents already on-conflict-do-nothing)
      if (b.timelineEvents?.length) {
        await storeTimelineEvents(prId, userId, b.timelineEvents);
        counts.events += b.timelineEvents.length;
      }

      counts.prs += 1;
    } catch (e: any) {
      errors.push(String(e?.message ?? e));
    }
  }

  return { prIds, counts, errors };
}
