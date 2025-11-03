import { db } from "@/lib/db/client";
import { githubRawData } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export interface RawDataPayload {
  pr?: any;
  files?: any[];
  commits?: any[];
  reviews?: any[];
  reviewComments?: any[];
  timeline?: any[];
}

export async function storeRawData(
  userId: string,
  repoFullName: string,
  prNumber: number,
  data: RawDataPayload,
): Promise<void> {
  const [repoOwner, repoName] = repoFullName.split("/");

  const entries = [];

  // Store PR data
  if (data.pr) {
    entries.push({
      userId,
      dataType: "pr",
      repoFullName,
      repoOwner,
      repoName,
      externalId: prNumber.toString(),
      rawResponse: data.pr,
    });
  }

  // Store files data
  if (data.files && data.files.length > 0) {
    entries.push({
      userId,
      dataType: "pr_files",
      repoFullName,
      repoOwner,
      repoName,
      externalId: prNumber.toString(),
      rawResponse: data.files,
    });
  }

  // Store commits data
  if (data.commits && data.commits.length > 0) {
    entries.push({
      userId,
      dataType: "pr_commits",
      repoFullName,
      repoOwner,
      repoName,
      externalId: prNumber.toString(),
      rawResponse: data.commits,
    });
  }

  // Store reviews data
  if (data.reviews && data.reviews.length > 0) {
    entries.push({
      userId,
      dataType: "pr_reviews",
      repoFullName,
      repoOwner,
      repoName,
      externalId: prNumber.toString(),
      rawResponse: data.reviews,
    });
  }

  // Store review comments data
  if (data.reviewComments && data.reviewComments.length > 0) {
    entries.push({
      userId,
      dataType: "pr_review_comments",
      repoFullName,
      repoOwner,
      repoName,
      externalId: prNumber.toString(),
      rawResponse: data.reviewComments,
    });
  }

  // Store timeline data
  if (data.timeline && data.timeline.length > 0) {
    entries.push({
      userId,
      dataType: "pr_timeline",
      repoFullName,
      repoOwner,
      repoName,
      externalId: prNumber.toString(),
      rawResponse: data.timeline,
    });
  }

  // Bulk insert all entries
  if (entries.length > 0) {
    await db
      .insert(githubRawData)
      .values(entries)
      .onConflictDoUpdate({
        target: [
          githubRawData.userId,
          githubRawData.dataType,
          githubRawData.externalId,
        ],
        set: {
          rawResponse: sql`excluded.raw_response`,
          fetchedAt: new Date(),
        },
      });
  }
}
