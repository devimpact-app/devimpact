import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { User, users } from "@/lib/db/schema";
import { CliStatus, OnboardingState } from "@/types/api/cli";
import { eq } from "drizzle-orm";
import { jsonUnauthorized } from "../../_lib/http";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonUnauthorized("Unauthorized");
  }

  const user: User = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .then((rows) => rows[0]);

  return Response.json({
    onboardingState:
      (user.onboardingState as OnboardingState) ?? "account_created",
    hasCliToken: !!user.cliTokenHash,
    cliLinkedAt: user.cliLinkedAt ? user.cliLinkedAt.toISOString() : null,
    lastSyncAt: user.cliLastSyncAt ? user.cliLastSyncAt.toISOString() : null,
    hasActivity: !!user.cliLastSyncAt,
  } satisfies CliStatus);
}
