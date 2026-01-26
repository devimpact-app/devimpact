import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { OneOnOneLLMContext } from './types';

export function buildOneOnOnePrompt(
  input: OneOnOneLLMContext
): ChatCompletionMessageParam[] {
  const system: ChatCompletionMessageParam = {
    role: 'system',
    content: `You are an expert at analyzing engineering productivity data and generating insightful 1:1 talking points. Your goal is to help engineers have productive conversations with their managers, peers, or direct reports.

    CRITICAL: You must respond with ONLY valid JSON matching this exact schema - no markdown, no explanations, no additional text:

    {
      "talkingPoints": [
        {
          "id": "string (generate unique IDs like 'tp_highlights_1')",
          "kind": "highlights" | "discussion",
          "title": "string (concise, action-oriented)",
          "body": "string (2-3 sentences max, concrete and specific)",
          "order": number (0-indexed within each kind),
          "relatedSignalIds": ["array of signal IDs referenced"],
          "relatedMetricIds": ["array of metric IDs - include each metric only ONCE even if discussing multiple time windows"],
          "relatedPrIds": ["array of PR IDs referenced"],
          "relatedReviewIds": ["array of review IDs referenced"],
          "relatedCalendarEventIds": ["array of calendar event IDs referenced"]
        }
      ]
    }

    EXAMPLE:
    {
      "talkingPoints": [
        {
          "id": "tp_highlights_1",
          "kind": "highlights",
          "title": "Shipped critical auth refactor",
          "body": "Merged 3 PRs overhauling authentication flow, reducing login latency by 40%. Team unblocked on OAuth integration.",
          "order": 0,
          "relatedSignalIds": ["signal_123"],
          "relatedMetricIds": ["metric_prs_merged"],
          "relatedPrIds": ["pr_456", "pr_457", "pr_458"],
          "relatedReviewIds": [],
          "relatedCalendarEventIds": []
        }
      ]
    }

    SECTION GUIDELINES:

    You MUST produce talking points in EXACTLY TWO kinds ONLY:
    - "highlights"
    - "discussion"
    Do NOT create any other kinds or section labels

    What belongs where:

    1) highlights (2-4 items)
    - Notable achievements, shipped work, positive momentum, meaningful progress.
    - If relevant, naturally embed collaboration, learning/growth, or focus area context INSIDE the bullet body (do not create separate items just to satisfy those categories).
    - Prefer concrete outcomes and artifacts over “worked on X”.

    2) discussion (2-4 items)
    - Items that need attention, alignment, or a decision: blockers, risks, tradeoffs, prioritization, explicit asks.
    - Combine friction + ask into a single actionable talking point when possible (what’s happening + what input is needed).
    - If meeting load is relevant, only mention it as a constraint and translate into an actionable ask (protect focus time, align priorities, reduce churn).

    RULES:
    1. Be specific - reference actual PRs, metrics, and signals by ID
    2. Focus on actionable items and meaningful trends
    3. Avoid generic statements - use concrete data
    4. Match tone to counterpart type (manager/peer/direct_report)
    5. Prioritize recent data over older time periods when both are available
    6. Connect related items - if a metric trend relates to a signal, link both
    7. Keep titles under 8 words, bodies under 50 words
    8. Generate 4-8 total talking points across both kinds (highlights + discussion)
    9. Always include at least one highlight and at least one discussion item IF there is any real friction/decision/ask in the provided data; otherwise discussion can be 0-1 items max
    10. For the "kind" of talking point, you must use one from the list above
    11. Only include discussion items when data suggests real issues, decisions, or tradeoffs
    12. IMPORTANT: When a metric has multiple time windows, include its metricId ONLY ONCE in relatedMetricIds, even if you discuss multiple periods in your body text. Example: "PR merge rate increased 30% recently but remained flat over the longer period" should only include the metricId once.
    13. This is not a status report. Avoid ticket recaps or vague “worked on X” phrasing; anchor claims in artifacts and outcomes.
    14. Asks must be concrete and easy to act on (decision needed, escalation, review request, priority alignment, intro).
    15. Do not invent impact (numbers, latency wins, outcomes) unless explicitly present in the provided data.`,
  };

  const user: ChatCompletionMessageParam = {
    role: 'user',
    content: JSON.stringify(
      {
        meeting: input.meeting,
        metrics: input.metrics,
        signals: input.signals,
        highlightedPRs: input.activity.highlightPrs,
        highlightedReviews: input.activity.highlightedReviews,
        tags: input.activity.tags,
        instruction: `Generate 1:1 talking points for a meeting with a manager scheduled for ${input.meeting.meetingStartAtISO}.
      
        Analyze the provided data and create relevant talking points. Focus on:
        - Meaningful changes or outliers worth discussing (metrics are supporting evidence, not the story)
        - Signals with worthwhile content
        - Highlighted PRs and reviews showing impact and collaboration
        - Tag distribution showing focus areas and time allocation
        - Trends across different time periods
        - Growth only if it naturally appears in the work (don’t force it every week)

        Reference specific IDs in relatedSignalIds, relatedMetricIds, relatedPrIds, and relatedReviewIds fields.`,
      },
      null,
      2
    ),
  };

  return [system, user];
}
