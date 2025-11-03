import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { syncUserGitHubData } from "@/lib/integrations/github/sync/sync-user-details";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncUserGitHubData(session.user.id);

    return NextResponse.json({
      success: true,
      ...result,
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
