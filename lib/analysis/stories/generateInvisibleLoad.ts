import { AUTHORED_PRS_COUNT_V1 } from "../metrics/catalog/pullRequests";
import {
  REVIEW_FIRST_RESPONDER_COUNT_V1,
  REVIEW_LATENCY_SECONDS_AVG_V1,
  REVIEWS_GIVEN_COUNT_V1,
} from "../metrics/catalog/reviews";
import { runBatchServer } from "../metrics/runBatchServer";
import { StoryCard } from "./types";

type Args = {
  tenantId: string;
  start: Date;
  end: Date;
};

export async function generateInvisibleLoad(args: Args): Promise<StoryCard> {
  const startISO = args.start.toISOString();
  const endISO = args.end.toISOString();

  const batch = await runBatchServer(
    {
      requests: [
        {
          metricId: REVIEWS_GIVEN_COUNT_V1.id,
          input: { start: startISO, end: endISO, shape: "stat" },
        },
        {
          metricId: REVIEW_LATENCY_SECONDS_AVG_V1.id,
          input: { start: startISO, end: endISO, shape: "stat" },
        },
        {
          metricId: REVIEW_FIRST_RESPONDER_COUNT_V1.id,
          input: { start: startISO, end: endISO, shape: "stat" },
        },
        {
          metricId: AUTHORED_PRS_COUNT_V1.id,
          input: { start: startISO, end: endISO, shape: "stat" },
        },
      ],
    },
    args.tenantId,
  );

  const resultMap: Record<string, number> = {};
  for (const r of batch.results) {
    const value = r.shape === "stat" ? (r.data[0]?.value ?? 0) : 0;
    resultMap[r.metricId] = value;
  }

  const reviewsGiven = resultMap[REVIEWS_GIVEN_COUNT_V1.id] ?? 0;
  const avgLatency = resultMap[REVIEW_LATENCY_SECONDS_AVG_V1.id] ?? 0;
  const firstResponder = resultMap[REVIEW_FIRST_RESPONDER_COUNT_V1.id] ?? 0;
  const prsAuthored = resultMap[AUTHORED_PRS_COUNT_V1.id] ?? 0;

  // Derived ratios
  const reviewToAuthorRatio = prsAuthored ? reviewsGiven / prsAuthored : 0;
  const firstResponderShare = reviewsGiven ? firstResponder / reviewsGiven : 0;

  // Responsiveness (inverse of latency; normalizing)
  const responsiveness = avgLatency > 0 ? 1 / (1 + avgLatency / 3600) : 0;

  // Weighted score
  const score =
    0.5 * Math.min(reviewToAuthorRatio / 2, 1) + // cap ratio contribution
    0.3 * firstResponderShare +
    0.2 * responsiveness;

  let severity: "info" | "notable" | "strong";
  if (score >= 0.7) severity = "strong";
  else if (score >= 0.4) severity = "notable";
  else severity = "info";

  // Build readable summary
  const summary =
    severity === "strong"
      ? `You’ve been unblocking teammates fast — ${reviewsGiven} reviews given, with ${Math.round(
          firstResponderShare * 100,
        )}% as first responder.`
      : severity === "notable"
        ? `You’ve been consistently active in reviews (${reviewsGiven} given, ${prsAuthored} PRs authored).`
        : `You’ve been balancing reviewing and authoring work (${reviewsGiven} reviews vs ${prsAuthored} PRs).`;

  const card: StoryCard = {
    id: "invisible_load.v1",
    tenantId: args.tenantId,
    period: { start: args.start, end: args.end },
    title: "Invisible Load",
    summary: summary,
    severity: severity,
    intent: "recognition",
    kpis: [
      { label: "Reviews given", value: reviewsGiven },
      {
        label: "First responder",
        value: `${Math.round(firstResponderShare * 100)}%`,
      },
      { label: "Avg review latency", value: Math.round(avgLatency), unit: "s" },
      { label: "Authored PRs", value: prsAuthored },
    ],
    evidence: [
      { metricId: REVIEWS_GIVEN_COUNT_V1.id, value: reviewsGiven },
      { metricId: REVIEW_LATENCY_SECONDS_AVG_V1.id, value: avgLatency },
      { metricId: REVIEW_FIRST_RESPONDER_COUNT_V1.id, value: firstResponder },
      { metricId: AUTHORED_PRS_COUNT_V1.id, value: prsAuthored },
    ],
    generatedAt: new Date(),
  };

  return card;
}
