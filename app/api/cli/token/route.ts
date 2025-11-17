import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { generateCliToken, hashCliToken } from "@/lib/utils/crypto";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const plainToken = generateCliToken();
  const tokenHash = hashCliToken(plainToken);

  await db
    .update(users)
    .set({ cliTokenHash: tokenHash })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ cliToken: plainToken });
}
