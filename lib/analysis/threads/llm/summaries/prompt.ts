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
        "reasons": ["string", "..."],
        "updates": null | {
          "headline": "string | null",
          "bullets": ["string", "..."] | null,
          "referencedEventIds": ["uuid", "..."] | null,
          "generatedAt"?: "ISO datetime string"
        }
      }

      HARD CONSTRAINTS:
      - Use only information present in the input.
      - Do NOT invent project names, timelines, outcomes, owners, or business context.
      - Do NOT mention private repo names if the input only provides vague repo values; if repo is present, you may mention it.
      - Keep it calm and engineer-native. No hype. No motivational language.
      - referencedEventIds MUST be drawn from the input events' IDs. No other IDs.

      STYLE TARGET:
      - Title: 4–9 words. Concrete, specific, stable across updates.
      - Headline: 1 sentence, <= 25 words. A compact "what this thread is about" statement.
      - Bullets: 3–6 bullets max.
        - Each bullet <= 20 words.
        - Each bullet should represent a distinct facet: scope shipped, refactor, reliability, alignment, etc.
        - Avoid long comma lists. Prefer compact statements.
      - Reasons: 3–6 short, concrete reasons. No fluff.

      EVENT INTERPRETATION GUIDELINES:
      - PR events: Prefer the PR summary (short + highlights/tags). Use size/process signals sparingly ("large change", "multi-round review") only if it clarifies impact.
      - Review events: Treat as collaboration. Mention themes (quality bar, unblocking, architectural feedback) only if strongly implied by input.
      - Meeting events: Only include if they are high-signal (incident, interview, architecture/design review, demo w/ ownership cues, org alignment). Routine meetings should not dominate.
      - If newEvents contain mixed unrelated items, keep the thread scoped to the strongest common theme; de-emphasize outliers (but do not omit them from referencedEventIds if used).

      BULLET GOVERNANCE (IMPORTANT):
      - In update_existing mode, input.thread.bullets contains existing bullets with:
        { id, sortIndex, text, referencedEventIds, editable }.
      - You MUST return the full, final bullets array (not a diff).

      Editable rules:
      - If editable=false for a bullet:
        - You MUST preserve it exactly:
          - bulletId must equal that bullet's id
          - text must be identical
          - referencedEventIds must be identical
          - sortIndex must remain the same
        - Do NOT delete it, rewrite it, or move it.
      - If editable=true for a bullet:
        - You MAY edit text and referencedEventIds, and you MAY reorder it by changing sortIndex.
        - Prefer small, conservative edits; do not rewrite everything unless newEvents truly require it.

      Creation rules:
      - You MAY create new bullets by setting bulletId = null.
      - New bullets must have sortIndex values that do not conflict with preserved (editable=false) bullets.

      Deletion rules:
      - Do NOT delete bullets. If you think something should be removed, leave it as-is and lower confidence.

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
      - Set updates = null.

      2) update_existing:
      - Preserve the existing thread's intent and wording where possible.
      - Apply BULLET GOVERNANCE rules strictly.
      - Incorporate newEvents without rewriting history.
      - Only change editable=true bullets when necessary to reflect newEvents.
      - You may add new bullets (bulletId=null) when newEvents add meaningful scope.
      - updates MUST reflect what changed SINCE the last sync (based on newEvents only):
        - updates.headline: optional, <= 16 words
        - updates.bullets: optional, max 3 bullets, each <= 14 words
        - updates.referencedEventIds: include ONLY event IDs from newEvents that justify the updates text
        - If there is no meaningful change, set updates = null.

      CONFIDENCE SCORING (0..1):
      - 0.85–1.0: clear single theme + strong supporting details (PR summaries/tags) with low ambiguity.
      - 0.65–0.84: mostly coherent, minor ambiguity or sparse details.
      - 0.45–0.64: weak theme, limited evidence, or many mixed items.
      - <0.45: avoid unless input is extremely noisy; still produce best possible output.

      REASONS:
      Provide 3–6 short reasons like:
      - "shared domain tags: auth, billing"
      - "same repo and feature area"
      - "multiple PRs advance same feature"
      - "architecture meeting aligns with related changes"
      - "review events indicate cross-team unblocking"
      Keep reasons concrete and grounded.`,
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
          outputFormat:
            'Return ONLY JSON matching the schema. No markdown. No extra keys.',
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
