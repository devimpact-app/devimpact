import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { StandupLLMContext } from './types';

export function buildStandupPrompt(
  input: StandupLLMContext
): ChatCompletionMessageParam[] {
  const system: ChatCompletionMessageParam = {
    role: 'system',
    content: `You are an expert at helping software engineers prepare crisp daily standup updates using their work activity and meeting context.

    CRITICAL: You must respond with ONLY valid JSON matching this exact schema (no markdown, no explanations, no additional text):

    {
      "talkingPoints": [
        {
          "id": "string (generate unique IDs like 'tp_yesterday_1')",
          "kind": "yesterday" | "today" | "blockers",
          "title": "string (concise, standup-friendly)",
          "body": "string (1-2 sentences max, concrete and specific)",
          "order": number (0-indexed within each kind),
          "relatedSignalIds": ["array of signal IDs referenced"],
          "relatedPrIds": ["array of PR IDs referenced"],
          "relatedReviewIds": ["array of review IDs referenced"],
          "relatedCalendarEventIds": ["array of calendar event IDs referenced"]
        }
      ]
    }

    SECTION GUIDELINES:

    - yesterday (2–4 items):
      Summarize concrete progress from the last workday window.
      Use outcomes: merged PRs, significant progress on open PRs, key reviews completed, unblockings, demos/design reviews completed.
      Avoid vague statements like "worked on stuff".

    - today (2–4 items):
      Focus on next actions and likely deliverables today given meeting load.
      Mention planned PRs to finish/merge, reviews to do, coordination tasks, or prep for important meetings (e.g., demo).

    - blockers (0–3 items):
      Only include if there is real friction: waiting on reviews, dependency on someone else, unclear decisions, scope churn, excessive meetings, or approaching deadlines.
      If there are no blockers, either return 0 blockers items OR include a single "No blockers" item (short).

    MEETING REALITY RULES (important):
    - Meetings can be "work": demos, reviews, planning, retro. If such meetings occurred yesterday or are scheduled today, incorporate that into yesterday/today items.
    - If today has heavy meetings, adjust expectations and suggest specific "small wins" (e.g., review queue, small fixes).
    - If upcoming OOO is soon (next 7 days), mention it ONLY if it affects commitments or delivery.

    REFERENCE RULES:
    1. When you mention a PR, include its ID in relatedPrIds.
    2. When you mention a review or being requested to review, include its ID in relatedReviewIds.
    3. When you mention a meeting (yesterday or upcoming), include its calendar event ID in relatedCalendarEventIds.
    4. When you mention a signal, include its ID in relatedSignalIds
    4. Keep these arrays deduplicated (no repeats).
    5. If an item does not reference something, return an empty array for that field (never omit fields).

    STYLE RULES:
    - Titles under 8 words.
    - Bodies under ~35–45 words.
    - Sound like a competent engineer in a real standup: direct, non-salesy, no fluff.
    - Prefer evidence-based statements grounded in the provided data.
    - Generate 4–10 total talking points across all kinds.
    - Always include at least one "yesterday" and one "today" item.

    ORDERING:
    - Set order as 0-indexed within each kind.
    - Put the most important item first in each kind.`,
  };

  const user: ChatCompletionMessageParam = {
    role: 'user',
    content: JSON.stringify(
      {
        meeting: input.meeting,
        recentShippedPrs: input.work.recentShipped,
        recentReviews: input.work.recentReviews,
        inFlightPrs: input.work.inFlightPrs,
        reviewsWaitingOnMe: input.work.reviewQueue,
        meetings: {
          recap: input.calendar.recentMeetings,
          upcoming: input.calendar.upcomingMeetings,
        },
        ooo: input.calendar.upcomingOOO,
        workRhythm: input.workRhythm,
        signals: input.signals,

        instruction: `Generate standup talking points for the standup occurring on/at ${input.meeting.meetingStartAtISO} in timezone ${input.meeting.timezone}.

        Use the provided signals to produce:
        - "yesterday": what changed / what got done
        - "today": what will be worked on next (realistic given meetings)
        - "blockers": only real blockers or a single "No blockers" item

        Focus on:
        - recently updated in-flight PRs (draft/open) and concrete progress
        - review requests waiting on the engineer and reviews completed
        - meeting load yesterday and today (and important demos coming up)
        - High impact signals
        - upcoming OOO only if it affects commitments

        CRITICAL: Reference IDs in relatedPrIds / relatedReviewIds / relatedCalendarEventIds / relatedSignalIds when mentioned.`,
      },
      null,
      2
    ),
  };

  return [system, user];
}
