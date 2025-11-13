import { jsonOK } from "../../_lib/http";
import { ALL_METRICS } from "@/lib/analysis/metrics/catalog";

export async function GET() {
  const body = { metrics: ALL_METRICS };

  // Cache: 1 hour (same as cacheTtlSeconds in the item above)
  const res = jsonOK(body);
  res.headers.set(
    "Cache-Control",
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=600",
  );
  return res;
}
