// app/api/timeline/route.ts

import { NextResponse } from "next/server";
import { getActivityEventsForRange } from "@/lib/analysis/timeline/getActivityEventsForRange";
import { ActivityEvent } from "@/lib/analysis/timeline/types";
import { auth } from "@/lib/auth"; // if using NextAuth
import { jsonOK, jsonUnauthorized } from "../_lib/http";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const session = await auth();
  if (!session?.user?.id) {
    return jsonUnauthorized();
  }

  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const limitParam = searchParams.get("limit");

  if (!startParam || !endParam) {
    return NextResponse.json(
      { error: "Missing required query params: tenantId, start, end" },
      { status: 400 },
    );
  }

  const start = new Date(startParam);
  const end = new Date(endParam);
  const limit = limitParam ? Number(limitParam) : undefined;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json(
      { error: "Invalid start or end date" },
      { status: 400 },
    );
  }

  const events: ActivityEvent[] = await getActivityEventsForRange({
    tenantId: session.user.id,
    start,
    end,
    limit,
  });

  return jsonOK({ events });
}
