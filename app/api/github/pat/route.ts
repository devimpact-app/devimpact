// app/api/github/pat/route.ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { integrationTokens } from "@/lib/db/schema";
import { encrypt } from "@/lib/utils/crypto";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await request.json();

  if (!token || !token.startsWith("ghp_")) {
    return NextResponse.json(
      { error: "Invalid Classic PAT format" },
      { status: 400 },
    );
  }

  try {
    // Verify token works
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const scopes = response.headers.get("x-oauth-scopes");
    if (!scopes?.includes("repo")) {
      return NextResponse.json(
        {
          error: "Token needs 'repo' scope",
        },
        { status: 400 },
      );
    }

    // Encrypt and store
    const encryptedToken = encrypt(token);

    await db
      .insert(integrationTokens)
      .values({
        userId: session.user.id,
        provider: "github",
        tokenType: "pat",
        accessToken: encryptedToken,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving PAT:", error);
    return NextResponse.json(
      {
        error: "Failed to save token",
      },
      { status: 500 },
    );
  }
}
