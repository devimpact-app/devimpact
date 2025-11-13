import { StoryCard, StorySeverity, StoryIntent, StoryContext } from "./types";

export async function generateProductiveWindowsStory(
  ctx: StoryContext,
): Promise<StoryCard> {
  const { tenantId } = ctx;

  // Stubbed values for the demo
  const peakDay = "Tuesday";
  const peakHourRange = "9–11 AM";
  const deepWorkBlocksPerWeek = 3;
  const eveningCodingShare = 0.15; // 15%

  const summary =
    `You tend to do your heaviest coding early in the week, ` +
    `with most activity landing on ${peakDay} mornings between ${peakHourRange}. ` +
    `You also get about ${deepWorkBlocksPerWeek} solid deep-work blocks per week ` +
    `and only around ${(eveningCodingShare * 100).toFixed(0)}% of your work happens late in the evening. ` +
    `This is a good window to protect in your calendar for focused work.`;

  const severity: StorySeverity = "info";
  const intent: StoryIntent = "insight";

  return {
    id: "productive_windows.v1",
    tenantId,
    period: { start: ctx.start, end: ctx.end },
    title: "Your Peak Focus Times",
    summary,
    severity,
    intent,
    kpis: [
      {
        label: "Peak coding day",
        value: peakDay,
      },
      {
        label: "Peak hours",
        value: peakHourRange,
      },
      {
        label: "Deep-work blocks / week",
        value: deepWorkBlocksPerWeek,
      },
      {
        label: "Evening coding",
        value: `${(eveningCodingShare * 100).toFixed(0)}%`,
      },
    ],
    evidence: [
      {
        metricId: "activity.commits_by_dow.v1",
        value: 1, // stub; real impl would be e.g. max index
        label: "Commit distribution by weekday",
      },
      {
        metricId: "activity.commits_by_hour.v1",
        value: 1,
        label: "Commit distribution by hour",
      },
      {
        metricId: "activity.deep_work_blocks_per_week.v1",
        value: deepWorkBlocksPerWeek,
        label: "Detected deep-work blocks per week",
      },
      {
        metricId: "activity.evening_coding_share.v1",
        value: eveningCodingShare,
        label: "Share of work after 7 PM",
      },
    ],
    // links: [
    //   {
    //     label: "Block this window in your calendar",
    //     href: "#", // stub for now
    //   },
    // ],
    generatedAt: new Date(),
    suggestions: [
      "Block two 2-hour focus windows during your peak times each week.",
      "Mark this window as low-meeting time in your calendar so teammates can see it.",
    ],
  };
}
