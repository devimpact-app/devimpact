import { NextRequest, NextResponse } from "next/server";
import { and, eq, not } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import { createGitHubClient } from "@/lib/integrations/github/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

export interface RepoInfo {
  id: string;
  node_id: string;
  full_name: string;
  private: boolean;
}

// TODO: add zod types
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
  if (!user || user.onboardingState !== "token_provided") {
    return NextResponse.json(
      { error: "No approved access found" },
      { status: 400 },
    );
  }

  const { octokit, authType, orgName } = await createGitHubClient(
    session.user.id,
  );

  let repos: RepoInfo[] = [];

  if (authType === "pat") {
    if (orgName) {
      const { data: orgRepos } = await octokit.rest.repos.listForOrg({
        org: orgName,
        per_page: 100,
      });
      repos = orgRepos.map((r: any) => ({
        id: String(r.id),
        node_id: r.node_id,
        full_name: r.full_name,
        private: r.private,
      }));
    } else {
      const { data: personalRepos } =
        await octokit.rest.repos.listForAuthenticatedUser({
          per_page: 100,
        });
      repos = personalRepos.map((r: any) => ({
        id: String(r.id),
        node_id: r.node_id,
        full_name: r.full_name,
        private: r.private,
      }));
    }
  } else {
    return NextResponse.json(
      { error: "Invalid GitHub authentication type" },
      { status: 400 },
    );
  }
  return NextResponse.json({ repos });
}
