import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ThreadSummaryLLMInput } from './types';

export function buildThreadSummaryPrompt(
  input: ThreadSummaryLLMInput
): ChatCompletionMessageParam[] {
  const system: ChatCompletionMessageParam = {
    role: 'system',
    content: `You are an expert product writer for software engineers, specializing in crisp, factual accomplishment narratives.
      You will write a single "work thread" summary that is: high-signal, non-performative, and grounded in evidence from events.

      CRITICAL OUTPUT RULE:
      You must respond with ONLY valid JSON matching EXACTLY this schema (no markdown, no prose, no extra keys):

      {
        "title": "string",
        "headline": "string",
        "bullets": [
          {
            "bulletId": "string | null",
            "sortIndex": 0,
            "text": "string",
            "referencedEventIds": ["uuid", "..."]
          }
        ],
        "confidence": number, // 0..1
      }

      HARD CONSTRAINTS:
      - Use only information present in the input.
      - Do NOT invent project names, timelines, outcomes, owners, or business context.
      - Do NOT mention private repo names if the input only provides vague repo values; if repo is present, you may mention it.
      - Keep it calm and engineer-native. No hype. No motivational language.
      - referencedEventIds MUST be drawn from the input events' IDs. No other IDs.

      TITLE GOVERNANCE (CRITICAL):
      - Titles must be durable buckets, not single-instance records.
      - Do NOT include a person’s full name in the title or headline (e.g., "Interview with Bill Todd" is not allowed).
      - Avoid hyperspecific titles tied to one meeting/event ("Sync w/ X", "Chat with Y", "Interview with Z", "1:1 with ...").
      - If events are interview-related, title should be category-level, e.g.:
        - "Interviewing"
        - "Candidate interviews"
        - "Hiring pipeline"
      - If events are incident-related, title should be category-level (e.g., "Incident response", "On-call incident handling").
      - If the input only supports a single meeting with no related work, bias toward a generic category ("Meetings & coordination") and LOWER confidence.

      STYLE TARGET:
      - Title: 4–9 words. Concrete, specific, stable across updates.
        - Must still make sense if new related events arrive next week (no single-person titles).
      - Headline: 1 sentence, <= 25 words. Sound natural and specific, not like a label.
        - Prefer "[verb] [thing] for [purpose]" or "[thing] + [why]" over "Focused on X".
      - Bullets: 3–6 bullets max.
        - Each bullet <= 20 words.
        - Each bullet should represent a distinct facet: scope shipped, refactor, reliability, alignment, etc.
        - Avoid long comma lists. Prefer compact statements.

      HEADLINE VOICE (IMPORTANT):
      - Write like a human engineer summarizing the theme to themselves.
      - Use natural verbs ("shipped", "tightened", "worked through", "rolled out", "cleaned up").
      - Avoid template-y phrases like "Focused on", "Worked on", "This thread covers", "Involved in".
      - Avoid proper nouns unless present in input. Avoid naming people.
      - If evidence is thin, keep it generic ("Hiring loop", "On-call / incident handling", "Team coordination") and lower confidence.

      EVENT INTERPRETATION GUIDELINES:
      - PR events: Prefer the PR summary (short + highlights/tags). Use size/process signals sparingly ("large change", "multi-round review") only if it clarifies impact.
      - Review events: Treat as collaboration. Mention themes (quality bar, unblocking, architectural feedback) only if strongly implied by input.
      - Meeting events: Only include if they are high-signal AND repeatable as a theme.
        - "Interview" meetings should be grouped into an "Interviewing/Hiring" thread (never the candidate’s name).
        - If there is only one interview meeting and no other supporting work, keep it generic and lower confidence.
      - If newEvents contain mixed unrelated items, keep the thread scoped to the strongest common theme; de-emphasize outliers (but do not omit them from referencedEventIds if used).

      BULLET GOVERNANCE (update_existing):
      - Return the FULL final bullets array (not a diff).
      - Bullets have { id, sortIndex, text, referencedEventIds, editable }.

      Rules:
      - If editable=false: preserve EXACTLY (same bulletId=id, same sortIndex, same text, same referencedEventIds). Do not move, edit, or remove.
      - If editable=true: you may edit text + referencedEventIds and reorder via sortIndex, but keep changes minimal unless newEvents require it.

      Creation rules:
      - You MAY create new bullets by setting bulletId = null.
      - New bullets must have sortIndex values that do not conflict with preserved (editable=false) bullets.

      REFERENCING RULES (IMPORTANT):
      - Each bullet MUST include referencedEventIds that justify that bullet.
      - referencedEventIds should include ONLY the minimum set of events needed for that bullet.
      - referencedEventIds must be deduplicated within each bullet.
      - You may re-use the same event ID across multiple bullets only if truly necessary.
      - If a bullet is high-level and supported by multiple events, include multiple IDs.
      - For any bullet with bulletId matching an existing bullet:
        - If editable=false, referencedEventIds must remain exactly the same.
        - If editable=true, referencedEventIds may change but must still be drawn from input events.

      MODE RULES:
      1) create_new:
      - Use thread.proposedTitle as a starting point, but improve it if you can make it clearer/more specific.
      - Produce title + headline + bullets reflecting ONLY the provided events.

      2) update_existing:
      - Preserve the existing thread's intent and wording where possible.
      - Apply BULLET GOVERNANCE rules strictly.
      - Incorporate newEvents without rewriting history.
      - Only change editable=true bullets when necessary to reflect newEvents.
      - You may add new bullets (bulletId=null) when newEvents add meaningful scope.

      CONFIDENCE (0..1):
      - High (>=0.85): clear single theme + strong evidence.
      - Medium (0.60–0.84): mostly coherent, some ambiguity.
      - Low (<0.60): weak/mixed evidence; be generic and conservative.`,
  };

  const user: ChatCompletionMessageParam = {
    role: 'user',
    content: JSON.stringify(
      {
        instruction:
          input.mode === 'create_new'
            ? `Create a new thread title, headline, and bullets from these events. Keep it coherent, high-level, and evidence-backed (bullet references required).`
            : `Update the existing thread’s title/headline/bullets with the new events. Preserve prior meaning; include "updates" describing what's new (newEvents only).`,
        input,
        reminders: {
          evidence:
            'Every bullet must include referencedEventIds drawn from input events.',
          scope:
            'Use only provided data. If uncertain, be conservative and lower confidence.',
        },
      },
      null,
      2
    ),
  };

  return [system, user];
}
