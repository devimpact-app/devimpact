import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { User, users } from "@/lib/db/schema";
import { CliStatus, OnboardingState } from "@/types/api/cli";
import { eq } from "drizzle-orm";
import { jsonOK, jsonUnauthorized } from "../../_lib/http";
import { NextRequest } from "next/server";
import { hashCliToken } from "@/lib/utils/crypto";

async function getUserFromCliToken(rawToken: string): Promise<User | null> {
  const hashed = hashCliToken(rawToken);

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.cliTokenHash, hashed))
    .limit(1);

  return rows[0] ?? null;
}

export async function GET(req: NextRequest) {
  const cliToken = req.headers.get("x-devimpact-cli-token");

  let user: User | null = null;

  if (cliToken) {
    user = await getUserFromCliToken(cliToken);
  } else {
    const session = await auth();
    if (session?.user?.id) {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      user = rows[0] ?? null;
    }
  }

  if (!user) {
    return jsonUnauthorized("Unauthorized");
  }

  const onboardingState: OnboardingState =
    (user.onboardingState as OnboardingState) ?? "account_created";
  const hasCliToken = !!user.cliTokenHash;
  const cliLinkedAt = user.cliLinkedAt ? user.cliLinkedAt.toISOString() : null;
  const lastSyncAt = user.cliLastSyncAt
    ? user.cliLastSyncAt.toISOString()
    : null;

  let recommendedStartISO: string;

  if (user.cliLastSyncAt) {
    const last = new Date(user.cliLastSyncAt);
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    const start = new Date(last.getTime() - bufferMs);
    recommendedStartISO = start.toISOString();
  } else {
    // 90 day default
    const lookbackDays = process.env.SYNC_LOOKBACK_DAYS
      ? parseInt(process.env.SYNC_LOOKBACK_DAYS)
      : 90;
    const start = new Date();
    start.setDate(start.getDate() - lookbackDays);
    start.setHours(0, 0, 0, 0);
    recommendedStartISO = start.toISOString();
  }

  const status: CliStatus = {
    onboardingState,
    hasCliToken,
    cliLinkedAt,
    lastSyncAt,
    hasActivity: !!user.cliLastSyncAt,
    recommendedStartISO,
  };

  return jsonOK(status);
}
