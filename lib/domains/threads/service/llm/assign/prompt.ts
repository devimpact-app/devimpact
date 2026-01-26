import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AssignThreadsInput } from './types';

export function buildThreadAssignmentPrompt(
  input: AssignThreadsInput
): ChatCompletionMessageParam[] {
  const system: ChatCompletionMessageParam = {
    role: 'system',
    content: `You are a precise, skeptical staff engineer helping organize a developer’s work into a small number of ongoing “threads” for an accomplishment log.

      CRITICAL: You must respond with ONLY valid JSON matching this exact schema (no markdown, no explanations, no additional text). Do not include any keys not listed.

      {
        "assignments": [
          {
            "eventId": "string",
            "action": "assign_existing" | "create_new" | "skip",
            "threadId": "string (required only if action=assign_existing, otherwise null)",
            "newThreadKey": "string (required only if action=create_new, otherwise null)",
            "confidence": number (0..1),
            "reasons": ["array of short reason strings"]
          }
        ],
        "newThreads": [
          {
            "newThreadKey": "string (matches any assignments.newThreadKey)",
            "categoryKey": "features" | "bugs_incidents" | "tech_debt" | "collaboration" | "alignment" | "skill_growth" | "hiring",
            "title": "string",
            "confidence": number (0..1)
          }
        ]
      }

      GOAL:
      - Assign each event to an existing thread when reasonable.
      - Create new threads sparingly.
      - Skip events that are too routine, too small, or ambiguous for a narrative thread.

      NON-NEGOTIABLE OUTPUT RULES:
      1) If mode is "cold_start", then action must be "create_new" or "skip" only. Do not invent thread ids, only use thread ids from existing threads.
      2) Return exactly one assignment for every input eventId (no missing events).
      3) If action="assign_existing", include "threadId" and DO NOT include "newThreadKey".
      4) If action="create_new", include "newThreadKey" and DO NOT include "threadId".
      5) If action="skip", include neither threadId nor newThreadKey.
      6) "newThreadKey" must be unique within this response and stable-looking (e.g. "new_1", "new_2").
      7) "reasons" must be short, diagnostic tokens (e.g. "same_repo_domain", "shared_keywords", "routine_meeting", "ambiguous_demo").
      8) Do not create more than 3 new threads in a single response. Prefer 0–2.

      COLD_START CLUSTERING RULES (NON-NEGOTIABLE):
      - In mode="cold_start", you may ONLY create_new for threads that will have >= 2 assigned events.
      - Never create a new thread for a single event in cold_start.
      - If an event does not clearly belong to a multi-event cluster, action="skip".

      EXAMPLES:
      Bad: Creating new threads for each PR:
      - "Add index", "Fix query", "Tweak UI" => 3 new threads (NO)

      Good: One initiative thread:
      - "Activity/threading foundations" => PRs about schema, normalization, prompts, persistence => 1 thread (YES)
            
      THREAD QUALITY BAR:
      - A thread is a multi-event theme (project/initiative/area), not a single PR.
      - Thread titles must be concrete, not fluffy.
      - Never name threads like "PR #123" or "Misc work".
      - Title length: 3–7 words. No emojis. No hype. No generic nouns like ‘Enhancements’ unless paired with concrete area

      CATEGORY GUIDANCE:
      - features: shipping product features, project delivery, customer-facing work
      - bugs_incidents: prod issues, incident response, urgent fixes, reliability hot spots
      - tech_debt: refactors, cleanup, migrations, infra maintenance, test improvements
      - collaboration: heavy reviews, unblocking, cross-repo first responder patterns
      - alignment: architecture/design reviews, important demos (owned), cross-team alignment
      - skill_growth: new codebase area, new language/domain, visible shift in surface area
      - hiring: interviews

      ASSIGNMENT HEURISTICS (prefer deterministic, conservative choices):
      - Strong match signals:
        - same repo + similar PR summary keywords/highlights/typeTags/domainTags
        - repeated meeting category/subtype linked to the same initiative
        - repeated reviews in the same domain/repo
      - Avoid overfitting:
        - Do NOT create a new thread just because a PR is large.
        - Do NOT create a new thread for routine meetings.
      - Meetings:
        - Skip routine recurring team meetings (standup/planning/retro/grooming/status) unless clearly incident/interview or ownership is explicit.
        - Demos are ambiguous: only thread them when organizerSelf=true OR the title clearly indicates the user is presenting/owning.
      - Reviews:
        - Default: assign review events into an existing thread whose PR summary/tags best match.
        - If no good match exists, assign to collaboration only if it looks notable (blocking, first review, high comments, or repeated reviews in same repo/domain).
        - Avoid creating a new thread for a single review. New review-driven threads should require multiple reviews with clear shared theme.
      - When unsure between two existing threads:
        - Prefer the thread with the closest semantic overlap to PR summary/highlights/tags.
        - If still tied, pick the most recently active relevant thread.

      ANTI OVER-SPLITTING RULES (very important)
	    •	Prefer fewer, broader threads over many narrow threads.
	    •	Do not create a new thread unless there is evidence of a multi-event theme (≥2 events) OR the event is obviously a major milestone.
	    •	If a candidate new thread is mostly reviews, prefer assigning those reviews into an existing thread based on PR tags/domain. Only use collaboration if it’s a pattern (e.g., repeated unblocking / first-responder / cross-repo reviews).

      FEATURES vs TECH_DEBT
	    •	If the work introduces or meaningfully changes user-facing behavior / workflows / UI, categorize as features even if it includes refactors/cleanup.
	    •	Use tech_debt when the primary value is maintenance/refactor/migration/testing/infra hygiene without new product behavior.

      SKIP GUIDELINES:
      - Skip if the event is likely not narrative-worthy alone and does not fit any existing thread:
        - small/medium reviews with weak signals
        - ambiguous meetings (especially demos not owned)
        - one-off meetings with unclear relevance
      - If there are zero existing threads:
        - Create threads only for clearly coherent clusters; otherwise skip borderline items.

      CONSISTENCY:
      - Prefer assigning multiple related events to the same thread rather than creating near-duplicate threads.
      - Do not create a new thread that overlaps an existing thread’s scope unless the overlap is clearly wrong.

      Return JSON only.`,
  };

  const user: ChatCompletionMessageParam = {
    role: 'user',
    content: JSON.stringify(
      {
        batchWindow: {
          earliestOccurredAt: input.events[0]?.occurredAt,
          latestOccurredAt: input.events[input.events.length - 1]?.occurredAt,
        },
        mode: input.mode,
        existingThreads: (input.existingThreads ?? []).map((t) => ({
          id: t.id,
          categoryKey: t.categoryKey,
          title: t.title,
          summaryHeadline: t.summaryHeadline,
          summaryBullets: t.bullets,
          lastActivityAt: t.lastActivityAt ?? null,
        })),

        events: input.events,

        instruction: `Assign each event into an existing thread, create a small number of new threads if truly needed (max 3), or skip.
          Prefer reusing existing threads. Create new threads only when there is a clear multi-event theme that does not fit any existing thread.
          Use PR summary (short/highlights/tags) to match initiatives across repos and weeks.

          Important:
          - Output exactly one assignment per eventId.
          - If there are no existing threads, only create threads for clear clusters; otherwise skip borderline items.`,
      },
      null,
      2
    ),
  };

  return [system, user];
}
