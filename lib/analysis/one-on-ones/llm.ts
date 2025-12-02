import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { OneOnOneLLMContext } from './types';

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
      "kind": "highlights" | "friction" | "asks" | "feedback_for_manager" | "goals" | "metrics" | "insights",
      "title": "string (concise, action-oriented)",
      "body": "string (2-3 sentences max, concrete and specific)",
      "order": number (0-indexed within each kind),
      "relatedInsightIds": ["array of insight IDs referenced"],
      "relatedMetricIds": ["array of metric IDs referenced"],
      "relatedPrIds": ["array of PR IDs referenced"],
      "relatedReviewIds": ["array of review IDs referenced"]
    }
  ]
}

SECTION GUIDELINES:

- highlights: Notable achievements, successful projects, positive trends (2-4 items)
- friction: Blockers, challenges, areas needing help (1-3 items, be constructive)
- asks: Specific requests for resources, support, or decisions (1-2 items)
- feedback_for_manager: Constructive feedback about processes, team dynamics (0-2 items, if applicable)
- goals: Forward-looking objectives tied to recent work (1-2 items)
- metrics: Key metric trends worth discussing (1-3 items, focus on notable changes)
- insights: Automated insights that need human context or action (1-3 items)

RULES:
1. Be specific - reference actual PRs, metrics, and insights by ID
2. Focus on actionable items and meaningful trends
3. Avoid generic statements - use concrete data
4. Match tone to counterpart type (manager/peer/direct_report)
5. Prioritize recent data (short window) over medium window
6. Connect related items - if a metric trend relates to an insight, link both
7. Keep titles under 8 words, bodies under 50 words
8. Generate 6-12 total talking points across all sections
9. Always include at least one highlight and one metric
10. Only include friction/asks if data suggests real issues`,
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
- Significant metric changes (>20% deltas are notable)
- High-severity insights (warning/critical)
- Highlighted PRs and reviews
- Tag distribution showing focus areas
- Trends across short vs medium windows

Reference specific IDs in relatedInsightIds, relatedMetricIds, relatedPrIds, and relatedReviewIds fields.`,
      },
      null,
      2
    ),
  };

  return [system, user];
}
