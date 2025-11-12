import { auth } from "@/lib/auth";
import { generateInvisibleLoad } from "@/lib/analysis/stories/generateInvisibleLoad";
import { jsonOK, jsonUnauthorized } from "../../_lib/http";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonUnauthorized();
  }

  const { searchParams } = new URL(request.url);
  const start = new Date(
    searchParams.get("start") ?? Date.now() - 30 * 86400 * 1000,
  );
  const end = new Date(searchParams.get("end") ?? Date.now());

  const story = await generateInvisibleLoad({
    tenantId: session.user.id,
    start,
    end,
  });

  return jsonOK(story);
}
