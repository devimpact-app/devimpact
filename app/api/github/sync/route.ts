import { auth } from "@/lib/auth";
import { createGitHubClient } from "@/lib/integrations/github/client";
import { fetchUserPRs } from "@/lib/integrations/github/api/fetch-user-prs";
import { db } from "@/lib/db/client";
import { githubSyncStatus } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TRACKED_REPOS = ["eng-coach/eng-coach"];

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get authenticated GitHub client
    const { octokit, username, authType } = await createGitHubClient(
      session.user.id,
    );

    // Get sync status
    const [syncStatus] = await db
      .select()
      .from(githubSyncStatus)
      .where(eq(githubSyncStatus.userId, session.user.id))
      .limit(1);

    // Determine date range
    let since: Date;
    let isInitialSync = false;

    if (syncStatus?.lastSyncedAt) {
      since = new Date(syncStatus.lastSyncedAt.getTime() - 5 * 60 * 1000);
    } else {
      since = new Date();
      since.setDate(since.getDate() - 90);
      isInitialSync = true;
    }

    // Fetch PRs - now just pass the octokit client
    const prs = await fetchUserPRs({
      octokit,
      username,
      since,
      repos: TRACKED_REPOS,
    });

    // Update sync status
    const now = new Date();

    if (syncStatus) {
      await db
        .update(githubSyncStatus)
        .set({
          lastSyncedAt: now,
          prsCreatedCount: (syncStatus.prsCreatedCount || 0) + prs.length,
        })
        .where(eq(githubSyncStatus.userId, session.user.id));
    } else {
      await db.insert(githubSyncStatus).values({
        userId: session.user.id,
        lastSyncedAt: now,
        coverageStartDate: since,
        prsCreatedCount: prs.length,
      });
    }

    return NextResponse.json({
      success: true,
      sync_type: isInitialSync ? "initial" : "incremental",
      auth_type: authType,
      username,
      date_range: {
        from: since.toISOString(),
        to: now.toISOString(),
      },
      prs_count: prs.length,
      sample_prs: prs.slice(0, 3).map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        created_at: pr.created_at,
        // repo: pr.base.repo.full_name,
      })),
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 },
    );
  }
}
