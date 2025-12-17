import { OneOnOneLLMContext } from '@/lib/analysis/prep/one-on-ones/types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export function buildTalkingPointsPrompt(
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
      "kind": "highlights" | "friction" | "asks" | "collaboration" | "growth" | "focus_areas" | "goals",
      "title": "string (concise, action-oriented)",
      "body": "string (2-3 sentences max, concrete and specific)",
      "order": number (0-indexed within each kind),
      "relatedInsightIds": ["array of insight IDs referenced"],
      "relatedMetricIds": ["array of metric IDs - include each metric only ONCE even if discussing multiple time windows"],
      "relatedPrIds": ["array of PR IDs referenced"],
      "relatedReviewIds": ["array of review IDs referenced"]
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
      "relatedInsightIds": ["insight_123"],
      "relatedMetricIds": ["metric_prs_merged"],
      "relatedPrIds": ["pr_456", "pr_457", "pr_458"],
      "relatedReviewIds": []
    }
  ]
}

SECTION GUIDELINES:

- highlights: Notable achievements, successful projects, positive trends (2-4 items)
- friction: Blockers, challenges, areas needing help (1-3 items, be constructive)
- asks: Specific requests for resources, support, or decisions (1-2 items)
- collaboration: Reviews given, helping others, knowledge sharing, cross-team work (1-3 items)
- growth: New technologies, patterns, or domains explored through recent work (1-2 items)
- focus_areas: How time is being spent across different work types or projects (1-2 items, based on tag distribution)
- goals: Forward-looking objectives tied to recent work patterns (1-2 items)

RULES:
1. Be specific - reference actual PRs, metrics, and insights by ID
2. Focus on actionable items and meaningful trends
3. Avoid generic statements - use concrete data
4. Match tone to counterpart type (manager/peer/direct_report)
5. Prioritize recent data over older time periods when both are available
6. Connect related items - if a metric trend relates to an insight, link both
7. Keep titles under 8 words, bodies under 50 words
8. Generate 6-12 total talking points across all sections
9. Always include at least one highlight and one item showing collaboration or focus areas
10. For the "kind" of talking point, you must use one from the list above
11. Only include friction/asks if data suggests real issues
12. IMPORTANT: When a metric has multiple time windows, include its metricId ONLY ONCE in relatedMetricIds, even if you discuss multiple periods in your body text. Example: "PR merge rate increased 30% recently but remained flat over the longer period" should only include the metricId once.`,
  };

  const user: ChatCompletionMessageParam = {
    role: 'user',
    content: JSON.stringify(
      {
        meeting: input.meeting,
        metrics: input.metrics,
        insights: input.insights,
        highlightedPRs: input.highlightPrs,
        highlightedReviews: input.highlightedReviews,
        tags: input.tags,
        instruction: `Generate 1:1 talking points for a ${input.meeting.counterpartType} meeting${
          input.meeting.counterpartLabel
            ? ` with ${input.meeting.counterpartLabel}`
            : ''
        }${input.meeting.meetingAtISO ? ` scheduled for ${input.meeting.meetingAtISO}` : ''}.
      
Analyze the provided data and create relevant talking points. Focus on:
- Significant metric changes (>20% change between time periods)
- High-severity insights (warning/critical)
- Highlighted PRs and reviews showing impact and collaboration
- Tag distribution showing focus areas and time allocation
- Trends across different time periods
- Growth opportunities from working with new technologies or domains

Reference specific IDs in relatedInsightIds, relatedMetricIds, relatedPrIds, and relatedReviewIds fields.`,
      },
      null,
      2
    ),
  };

  return [system, user];
}
