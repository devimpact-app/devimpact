import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db/client";
import { githubPendingRequests, integrationTokens } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    // TODO: verify signature of webhook on prod
    const payload = JSON.parse(body);
    const action = payload.action; // 'deleted', 'created'
    const orgLogin = payload.installation?.account?.login;
    const installationId = payload.installation?.id;
    const requestorLogin = payload.requestor?.login;
    const repos = payload.repositories.map((r: any) => r.full_name);

    if (action === "created") {
      const waitingRow = await db
        .select()
        .from(githubPendingRequests)
        .where(
          and(
            eq(githubPendingRequests.githubUsername, requestorLogin),
            eq(githubPendingRequests.status, "waiting"),
          ),
        );
      if (waitingRow.length > 0) {
        // Update pending request to approved
        await db
          .update(githubPendingRequests)
          .set({ status: "approved" })
          .where(eq(githubPendingRequests.id, waitingRow[0].id));

        // Also insert into integrationTokens
        await db.insert(integrationTokens).values({
          userId: waitingRow[0].userId,
          provider: "github",
          accessToken: "",
          tokenType: "installation",
          installationId: installationId.toString(),
          orgLogin: orgLogin,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
