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
        "summary": "string",
        "confidence": number, // 0..1
        "reasons": ["string", ...],
        "updates"?: {
          "headline"?: "string",
          "bullets"?: ["string", ...],
          "referencedEventIds": ["string", ...]
        }
      }

      HARD CONSTRAINTS:
      - Use only information present in the input.
      - Do NOT invent project names, timelines, outcomes, owners, or business context.
      - Do NOT mention private repo names if the input only provides vague repo values; if repo is present, you may mention it.
      - Keep it calm and engineer-native. No hype. No motivational language.

      STYLE TARGET:
      - Title: 4–9 words. Concrete, specific, stable.
      - Summary: 2–4 short sentences. Dense with meaning; minimal adjectives.
      - Avoid "did X, did Y, did Z" lists. Bundle work into coherent arcs (feature, cleanup, incident response, alignment).
      - Prefer outcomes and scope: shipped/merged, unblocked, refactored, aligned on design, closed loop in incident, etc.
      - Use technical-but-readable phrasing. Assume audience is the engineer (private log), not management.

      EVENT INTERPRETATION GUIDELINES:
      - PR events: Prefer the PR summary (short + highlights/tags). Use size/process signals sparingly ("large change", "multi-round review") only if it clarifies impact.
      - Review events: Treat as collaboration. Mention themes (quality bar, unblocking, architectural feedback) only if strongly implied by input.
      - Meeting events: Only include if they are high-signal (incident, interview, architecture/design review, demo w/ ownership cues, org alignment). Routine meetings should not dominate.
      - If newEvents contain mixed unrelated items, keep the thread scoped to the strongest common theme; de-emphasize outliers (but do not omit them from referencedEventIds if used).

      MODE RULES:
      1) create_new:
      - Use thread.proposedTitle as a starting point, but improve it if you can make it clearer/more specific.
      - Summary should explain what this thread is about based on the newEvents.

      2) update_existing:
      - Preserve the existing thread's intent and wording where possible.
      - Update the summary to incorporate newEvents WITHOUT rewriting history.
      - If the newEvents materially expand scope, extend the summary cautiously (do not change the meaning of prior summary).
      - Provide "updates" describing what changed since last time.
        - "updates.headline": optional, 1 line max.
        - "updates.bullets": optional, max 3 bullets, each <= 14 words.
        - "updates.referencedEventIds": MUST include only event IDs from newEvents (and only those actually referenced in headline/bullets/summary changes).
      - If there is no meaningful change, you may omit updates entirely OR include updates with only referencedEventIds (empty headline/bullets).

      REFERENCING RULES (IMPORTANT):
      - Only include IDs that exist in input events.
      - referencedEventIds must be deduplicated.
      - If you include updates, referencedEventIds MUST refer to the specific events that justify the updates content.

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
            ? `Create a new thread title + summary from these events. Keep it coherent and high-level; bundle related work.`
            : `Update the existing thread's title/summary with the new events. Preserve prior meaning; add "updates" describing what's new.`,
        input,
        reminders: {
          outputFormat:
            'Return ONLY JSON matching the schema. No markdown. No extra keys.',
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
