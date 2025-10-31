import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { githubSyncStatus, integrationTokens } from "@/lib/db/schema";
import { fetchUserPRs } from "@/lib/integrations/github/api/fetch-user-prs";
import { decrypt } from "@/lib/utils/crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const TRACKED_REPOS = ["Test-oauth-org-ian/Test-app"];

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get tokens (prefer PAT, fallback to OAuth)
    const tokens = await db
      .select()
      .from(integrationTokens)
      .where(eq(integrationTokens.userId, session.user.id));

    const patToken = tokens.find((t) => t.tokenType === "pat");
    const oauthToken = tokens.find((t) => t.tokenType === "oauth");

    let token: string;

    if (patToken) {
      token = decrypt(patToken.accessToken);
    } else if (oauthToken) {
      token = oauthToken.accessToken;
    } else {
      return NextResponse.json(
        {
          error: "No GitHub token found. Please connect GitHub.",
        },
        { status: 400 },
      );
    }

    // Get GitHub username
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        {
          error: "Invalid GitHub token",
        },
        { status: 401 },
      );
    }

    const githubUser = await userResponse.json();

    const [syncStatus] = await db
      .select()
      .from(githubSyncStatus)
      .where(eq(githubSyncStatus.userId, session.user.id))
      .limit(1);

    // Determine date range
    let since: Date;
    let isInitialSync = false;

    if (syncStatus?.lastSyncedAt) {
      // Incremental sync - add 5 minute buffer to catch any delayed updates
      since = new Date(syncStatus.lastSyncedAt.getTime() - 5 * 60 * 1000);
    } else {
      // Initial sync - last 90 days
      since = new Date();
      since.setDate(since.getDate() - 90);
      isInitialSync = true;
    }

    const prs = await fetchUserPRs({
      token,
      username: githubUser.login,
      since,
      repos: TRACKED_REPOS,
    });

    return NextResponse.json({
      success: true,
      username: githubUser.login,
      prs_count: prs.length,
      sample_prs: prs.slice(0, 3).map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        created_at: pr.created_at,
        repo: pr.repository_url.split("/").slice(-2).join("/"),
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
