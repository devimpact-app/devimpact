import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { integrationTokens, users } from "@/lib/db/schema";
import { decrypt, encrypt } from "@/lib/utils/crypto";
import { Octokit } from "@octokit/rest";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user || user.onboardingState !== "fg_pat_pending") {
    return NextResponse.json(
      { error: "No pending PAT approval found" },
      { status: 400 },
    );
  }

  const [row] = await db
    .select()
    .from(integrationTokens)
    .where(
      and(
        eq(integrationTokens.userId, session.user.id),
        eq(integrationTokens.provider, "github"),
        eq(integrationTokens.tokenType, "pat"),
      ),
    )
    .limit(1);

  if (!row || !row.orgLogin) {
    return NextResponse.json(
      { error: "No PAT for org found for user" },
      { status: 400 },
    );
  }

  const orgName = row.orgLogin;
  const encryptedToken = row.accessToken;
  const token = decrypt(encryptedToken);

  const octokit = new Octokit({ auth: token });

  try {
    const { data: org } = await octokit.rest.orgs.get({
      org: orgName,
    });

    console.log(`✅ Can access org: ${org.login}`);

    // Try to list repos in that org
    const { data: orgRepos } = await octokit.rest.repos.listForOrg({
      org: orgName,
      per_page: 1, // Just test with 1 repo
    });

    if (orgRepos.length === 0) {
      return NextResponse.json(
        { error: `Still no access to organization "${orgName}" repos.` },
        { status: 400 },
      );
    }

    console.log(
      `✅ Access to org "${orgName}" approved with ${orgRepos.length} repos`,
    );

    await db
      .update(users)
      .set({
        onboardingState: "fg_pat_approved",
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      success: true,
      state: "fg_pat_approved",
    });
  } catch (error) {
    console.error("Error checking PAT approval:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error checking PAT approval",
      },
      { status: 500 },
    );
  }
}
