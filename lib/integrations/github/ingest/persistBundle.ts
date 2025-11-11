import { storePR } from "../storage/store-pr";
import { storePRFiles } from "../storage/store-pr-files";
import { storePRCommits } from "../storage/store-pr-commits";
import { storeReviews } from "../storage/store-reviews";
import { storeReviewComments } from "../storage/store-review-comments";
import { storeTimelineEvents } from "../storage/store-timeline-events";
import { storeRawData } from "../storage/store-raw-data";
import type { PRIngestBundle } from "./bundle";

export async function persistBundles(
  userId: string,
  bundles: PRIngestBundle[],
  opts?: {
    saveRaw?: boolean; // default true
    reviewerLoginFilter?: string | null; // when doing reviewed-only flows
  },
) {
  const saveRaw = opts?.saveRaw ?? true;
  const filterReviewer = opts?.reviewerLoginFilter ?? null;

  const counts = {
    prs: 0,
    files: 0,
    commits: 0,
    reviews: 0,
    reviewComments: 0,
    events: 0,
  };
  const errors: string[] = [];

  for (const b of bundles) {
    try {
      // Optional: raw snapshot for transparency/debugging
      if (saveRaw) {
        await storeRawData(userId, b.repo.fullName, b.pr.number, {
          pr: b.pr,
          files: b.files ?? [],
          commits: b.commits ?? [],
          reviews: b.reviews ?? [],
          reviewComments: b.reviewComments ?? [],
          timeline: b.timeline ?? [],
        });
      }

      // PR first → get internal prId
      const prId = await storePR(userId, b.pr, b.repo.fullName);

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
      const reviews = filterReviewer
        ? (b.reviews ?? []).filter((r) => r.user?.login === filterReviewer)
        : (b.reviews ?? []);
      if (reviews.length) {
        const reviewer = filterReviewer ?? b.pr.user?.login ?? "unknown";
        await storeReviews(prId, userId, reviews, reviewer);
        counts.reviews += reviews.length;
      }

      // Review comments (match optional filter)
      const reviewComments = filterReviewer
        ? (b.reviewComments ?? []).filter(
            (c) => c.user?.login === filterReviewer,
          )
        : (b.reviewComments ?? []);
      if (reviewComments.length) {
        await storeReviewComments(prId, userId, reviewComments);
        counts.reviewComments += reviewComments.length;
      }

      // Timeline (immutable; your storeTimelineEvents already on-conflict-do-nothing)
      if (b.timeline?.length) {
        await storeTimelineEvents(prId, userId, b.timeline);
        counts.events += b.timeline.length;
      }

      counts.prs += 1;
    } catch (e: any) {
      errors.push(String(e?.message ?? e));
    }
  }

  return { counts, errors };
}
