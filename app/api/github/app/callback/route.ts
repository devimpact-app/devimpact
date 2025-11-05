import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { githubPendingRequests, integrationTokens } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  console.log("params:", params);

  const installationId = params.get("installation_id");
  const setupAction = params.get("setup_action");
  const state = params.get("state");

  console.log("GitHub App callback:", {
    installationId,
    setupAction,
    state,
  });

  if (!state) {
    return NextResponse.redirect(
      new URL("/onboarding?error=no_state", request.url),
    );
  }

  let userId: string;
  let githubUsername: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64").toString());
    userId = decoded.userId;
    githubUsername = decoded.githubUsername;
  } catch (e) {
    return NextResponse.redirect(
      new URL("/onboarding?error=invalid_state", request.url),
    );
  }

  console.log("Decoded state userId:", userId);

  // Case 1: Immediate installation (no approval needed)
  if (setupAction === "install" && installationId && userId) {
    // TODO: insert right into integrations table
    // await db
    //   .insert(integrationTokens)
    //   .values({
    //     userId,
    //     provider: "github",
    //     tokenType: "app",
    //     installationId,
    //   })
    //   .onConflictDoUpdate({
    //     target: [
    //       integrationTokens.userId,
    //       integrationTokens.provider,
    //       integrationTokens.tokenType,
    //     ],
    //     set: {
    //       installationId,
    //       updatedAt: new Date(),
    //     },
    //   });

    return NextResponse.redirect(
      new URL("/dashboard?status=connected", request.url),
    );
  }

  // Case 2: Approval required
  if (setupAction === "request") {
    // TODO: Store pending request in DB
    await db.insert(githubPendingRequests).values({
      userId,
      githubUsername,
      status: "waiting",
    });
    // For now, just redirect with message
    return NextResponse.redirect(
      new URL("/dashboard?status=pending", request.url),
    );
  }

  // Case 3: Update to existing installation
  if (setupAction === "update" && installationId) {
    // await db
    //   .update(integrationTokens)
    //   .set({
    //     installationId,
    //     updatedAt: new Date(),
    //   })
    //   .where(eq(integrationTokens.userId, userId));

    return NextResponse.redirect(
      new URL("/dashboard?status=updated", request.url),
    );
  }

  // Fallback
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
