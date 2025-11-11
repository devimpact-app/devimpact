import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { integrationTokens, users } from "@/lib/db/schema";
import { encrypt } from "@/lib/utils/crypto";
import { Octokit } from "@octokit/rest";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, orgName } = await request.json();

  if (!token || !token.startsWith("ghp_")) {
    return NextResponse.json(
      { error: "Invalid token format. Must start with 'ghp_'" },
      { status: 400 },
    );
  }

  const octokit = new Octokit({ auth: token });

  console.log("Testing token validity...");
  console.log("Org name provided:", orgName || "none (personal account)");

  try {
    // Step 1: Verify token is valid
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ Token is valid, belongs to: ${user.login}`);

    // Step 2: If org name provided, test access to that specific org
    if (orgName) {
      console.log(`Testing access to organization: ${orgName}`);

      try {
        // Try to get org info
        const { data: org } = await octokit.rest.orgs.get({
          org: orgName,
        });

        console.log(`✅ Can access org: ${org.login}`);

        // Try to list repos in that org
        const { data: orgRepos } = await octokit.rest.repos.listForOrg({
          org: orgName,
          per_page: 1, // Just test with 1 repo
        });

        // If 0 returned - pending state
        if (orgRepos.length === 0) {
          // Go to unauthorized state
          console.log(`⏳ 403 error accessing org "${orgName}"`);
          throw new Error("No access to org");
        }

        console.log(`✅ Can list org repos: ${orgRepos.length} repos found`);

        // Token has full access to org!
        const encryptedToken = encrypt(token);

        await db
          .insert(integrationTokens)
          .values({
            userId: session.user.id,
            provider: "github",
            tokenType: "pat",
            accessToken: encryptedToken,
            createdAt: new Date(),
            orgLogin: orgName,
          })
          .onConflictDoUpdate({
            target: [
              integrationTokens.userId,
              integrationTokens.provider,
              integrationTokens.tokenType,
            ],
            set: {
              accessToken: encryptedToken,
              updatedAt: new Date(),
            },
          });

        await db
          .update(users)
          .set({
            onboardingState: "token_provided",
          })
          .where(eq(users.id, session.user.id));

        return NextResponse.json({
          success: true,
          state: "token_provided",
          message: "Token connected successfully!",
          organization: orgName,
          repoCount: orgRepos.length,
        });
      } catch (orgError: any) {
        console.error("Error accessing org:", orgError);

        // If 404, org doesn't exist or token can't see it
        if (orgError.status === 404) {
          return NextResponse.json(
            {
              error: `Organization "${orgName}" not found. Please check the name and try again.`,
            },
            { status: 400 },
          );
        }

        // Other error
        throw orgError;
      }
    } else {
      // No org name provided - testing personal account access
      console.log("No org name provided - checking personal repos");

      // List personal repos
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser(
        {
          per_page: 1,
          affiliation: "owner",
        },
      );

      // If 0 returned - pending state
      if (repos.length === 0) {
        // Go to unauthorized state
        throw new Error("No access to repos");
      }

      console.log(
        `✅ Can access personal repos: ${repos.length > 0 ? "yes" : "no"}`,
      );

      const encryptedToken = encrypt(token);

      await db
        .insert(integrationTokens)
        .values({
          userId: session.user.id,
          provider: "github",
          tokenType: "pat",
          accessToken: encryptedToken,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            integrationTokens.userId,
            integrationTokens.provider,
            integrationTokens.tokenType,
          ],
          set: {
            accessToken: encryptedToken,
            updatedAt: new Date(),
          },
        });

      await db
        .update(users)
        .set({
          onboardingState: "token_provided",
        })
        .where(eq(users.id, session.user.id));

      return NextResponse.json({
        success: true,
        state: "token_provided",
        message: "Token connected successfully!",
        repoCount: repos.length,
      });
    }
  } catch (apiError: any) {
    console.error("GitHub API error:", apiError);

    // Check if it's a 401 (invalid token)
    if (apiError.status === 401) {
      return NextResponse.json(
        { error: "Invalid token. Please check and try again." },
        { status: 400 },
      );
    }

    // Other errors
    return NextResponse.json(
      {
        error: "Failed to validate token",
        details: apiError.message,
      },
      { status: 500 },
    );
  }
}
