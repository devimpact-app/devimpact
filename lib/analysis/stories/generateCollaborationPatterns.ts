import { StoryCard, StoryContext } from "./types";

export async function generateCollaborationPatternsStory(
  ctx: StoryContext,
): Promise<StoryCard> {
  const { tenantId, start, end } = ctx;

  const topCollaborator = "Alex";
  const sharedPRs = 6;
  const avgLatency = "45m";
  const uniqueCollabs = 3;

  const summary =
    `You collaborated most with ${topCollaborator} this period, across ${sharedPRs} shared PRs. ` +
    `Your exchanges with them were fast (~${avgLatency}), and work typically merged after a single review round. ` +
    `This suggests you’re part of a high-trust delivery loop that accelerates work for both sides.`;

  return {
    id: "collaboration_patterns.v1",
    tenantId,
    period: {
      start,
      end,
    },
    title: "Your Collaboration Patterns",
    summary,
    severity: "info",
    intent: "insight",
    kpis: [
      { label: "Top collaborator", value: topCollaborator },
      { label: "Shared PRs", value: sharedPRs },
      { label: "Avg latency w/ them", value: avgLatency },
    ],
    evidence: [
      { metricId: "collab.shared_prs_with_top", value: sharedPRs },
      { metricId: "collab.avg_review_latency_top", value: 45 * 60 },
      { metricId: "collab.unique_collaborators", value: uniqueCollabs },
    ],
    links: [],
    generatedAt: new Date(),
  };
}
