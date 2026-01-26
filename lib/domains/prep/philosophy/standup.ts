/**
 * DevImpact Standup Prep — Product Philosophy
 *
 * Goal:
 * Make standups shorter, calmer, and more useful for engineers — by reducing coordination cost
 * and making constraints (especially calendar-driven ones) visible without drama.
 *
 * Standup stance (what we believe):
 * - A standup is NOT a performance, a status theater, or a narration of ticket IDs.
 * - A standup IS a lightweight coordination checkpoint to:
 *    1) surface blockers early,
 *    2) align near-term intent,
 *    3) reduce drift around reviews/dependencies,
 *    4) make today’s constraints explicit (meetings, OOO, “prep-heavy” events).
 *
 * What DevImpact optimizes for:
 * - Engineer spends < 2 minutes preparing.
 * - Output is factual, minimal, and protects focus (does not create more admin).
 * - Blockers are harder to miss: review waits, dependency stalls, meeting overload.
 * - It never becomes a wall of AI text or a second dashboard.
 *
 * Engineer psychology (reality):
 * - Many engineers experience standups as reporting up, not collaborating.
 * - People omit blockers (political / awkward) and inflate productivity framing.
 * - Meetings are both inevitable AND often the real reason output looks “light”.
 * - Some meetings are themselves deliverables (demo, design review, planning/retro).
 *
 * DevImpact’s job:
 * Reduce cognitive load and help engineers say less — but say the right things,
 * including why “today” may be meeting-constrained.
 *
 * Inputs we digest (v1):
 *
 * 1) GitHub activity since last standup (or default window)
 *    - PRs opened / merged (shipped)
 *    - Reviews completed
 *    - PRs waiting on others (review latency / “stuck”)
 *    - PRs waiting on the engineer (action required)
 *    - Aging/size signals (large PRs, open PRs > N days, long review cycles)
 *
 * 2) Calendar context (read-only)
 *    - Yesterday meeting load (minutes/count) to explain low maker output
 *    - Today upcoming meetings (blocks that constrain focus and “today” commitments)
 *    - Near-term OOO (next few days) that affects sequencing & expectations
 *    - “Task-like meetings” that count as real work:
 *        - demo / show-and-tell
 *        - design review
 *        - sprint planning
 *        - retro
 *      (These should be surfaced as legitimate deliverables, not treated as noise.)
 *
 * 3) Standup recurrence
 *    - If recurring series is known:
 *        primary window = since last occurrence end (preferred)
 *        fallback = since last occurrence start
 *    - If unknown/manual:
 *        use meeting-type defaults (short window) + a longer window for trends
 *
 * What we explicitly do NOT assume:
 * - Jira is clean or consistent.
 * - Engineers can predict the future beyond constraints (“what I’ll do today” perfectly).
 * - Branch names / commit messages are meaningful enough to rely on.
 *
 * Output: A private briefing (not a script)
 *
 * 1. Yesterday
 *    - What actually happened since the last standup
 *    - Grounded in concrete activity (merged PRs, reviews, progress)
 *    - Includes contextual signals when output was constrained
 *      (e.g. high meeting load, planning sessions, design reviews)
 *
 *    Example:
 *      - Merged PR #482 (auth cleanup)
 *      - Reviewed 3 PRs
 *      - Heavy meeting day (design review + planning)
 *
 *    Meetings appear here only as *context*, not as excuses.
 *
 * 2. Today
 *    - What is realistically in motion today
 *    - Continues work already started
 *    - Treats certain meetings as real work when appropriate
 *      (e.g. demos, design reviews, sprint planning)
 *    - Signals when meetings will fragment focus or limit throughput
 *
 *    Example:
 *      - Continuing PR #491 (review feedback)
 *      - Design review at 2pm (prep required)
 *      - Meetings fragment afternoon focus
 *
 *    We avoid over-commitment or speculative promises.
 *
 * 3. Blockers / Risks
 *    - The most important section
 *    - Anything preventing progress or putting delivery at risk
 *    - Waiting on reviews, dependencies, oversized PRs, unclear ownership
 *    - Upcoming OOO only if it affects others
 *
 *    Example:
 *      - Waiting on infra review (3 days)
 *      - Large PR may need to be split
 *      - OOO starting Thursday
 *
 * Tone rules:
 * - Never shame engineers for meetings.
 * - Avoid prescriptive language (“you should”). Prefer observational (“looks like”, “worth noting”).
 * - Keep it terse; no walls of text; no “AI voice”.
 *
 * Basic success metrics:
 * - Opened within 30 minutes of standup.
 * - Time-in-prep < 2 minutes.
 * - Repeat usage for recurring standups.
 * - Qual feedback: “kept it short”, “caught a blocker”, “felt accurate”.
 *
 * Future versions (only after v1 works):
 * - Async standup mode: export a concise text snippet (Slack-ready), but never auto-post.
 * - Team-level patterns: “we’re review-stalled this week” (careful — privacy + trust).
 * - User tuning: choose which recurring meeting series is “standup”.
 * - Better meeting/task recognition: “demo” and “design review” as real deliverables.
 *
 * Failure modes to avoid:
 * - Redundant with GitHub (no synthesis).
 * - Manager-facing / performative tone.
 * - Verbose or overly “AI-generated”.
 * - Pushes commitments instead of reflecting constraints
 */
