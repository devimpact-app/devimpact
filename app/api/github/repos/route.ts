import { NextRequest, NextResponse } from "next/server";
import { and, eq, not } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import { createGitHubClient } from "@/lib/integrations/github/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (
    !user ||
    (user.onboardingState !== "fg_pat_approved" &&
      user.onboardingState !== "gh_app_approved")
  ) {
    return NextResponse.json(
      { error: "No approved access found" },
      { status: 400 },
    );
  }

  const { octokit, authType, orgName } = await createGitHubClient(
    session.user.id,
  );

  let repoNames: string[] = [];

  if (authType === "app") {
    const repos = await octokit.paginate("GET /installation/repositories", {
      per_page: 100,
    });
    repoNames = repos.map((repo) => repo.full_name);
  } else if (authType === "pat") {
    if (orgName) {
      const { data: orgRepos } = await octokit.rest.repos.listForOrg({
        org: orgName,
        per_page: 100,
      });
      repoNames = orgRepos.map((r: any) => r.full_name);
    } else {
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser(
        {
          per_page: 100,
        },
      );
      repoNames = repos.map((r: any) => r.full_name);
    }
  } else {
    return NextResponse.json(
      { error: "Invalid GitHub authentication type" },
      { status: 400 },
    );
  }
  return NextResponse.json({ repos: repoNames });
}
