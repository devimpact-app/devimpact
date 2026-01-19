/**
 * DevImpact 1:1 Prep — Product Philosophy
 *
 * Goal:
 * Make 1:1s feel less like “I hope I remember what I did” and more like
 * a calm, high-signal conversation about impact, support, and direction.
 *
 * 1:1 stance:
 * - A 1:1 is NOT a weekly status meeting. It is NOT a performance review rehearsal.
 * - A 1:1 IS the primary “management interface” for:
 *    1) unblocking work,
 *    2) aligning priorities and expectations,
 *    3) surfacing risks early (coordination, review pile-ups, overload),
 *    4) building a credible narrative of impact over time,
 *    5) getting feedback and coaching (which many engineers don’t reliably get).
 *
 * What DevImpact optimizes for:
 * - Engineer spends < 5 minutes preparing.
 * - Output is grounded in real work artifacts
 * - The prep helps the engineer manage up without sounding performative.
 *
 * Engineer psychology (reality):
 * - Many engineers are passionate about craft, but roles often reward coordination,
 *   meetings, and business throughput more than technical excellence.
 * - Mentorship is inconsistent; many 1:1s are either too tactical (tickets) or too vague.
 * - Ramp-up takes 6–12 months; teams rarely budget psychologically for this.
 * - Engineers can game velocity/cycle metrics; what matters is outcomes and trust.
 * - There is rising pressure to “use more AI” — with skepticism about quality/stability.
 *   DevImpact should not encourage AI theater; it should protect good engineering.
 *
 * DevImpact’s job:
 * - Provide an agenda that makes it easy to be:
 *    - credible (real work references),
 *    - efficient (tight framing),
 *    - strategic (what matters next),
 *    - supported (clear asks / feedback loops).
 *
 * Inputs we digest (v1):
 *
 * 1) Recent GitHub activity (primary window: “since last 1:1” if known; else default)
 *    - Shipped: PRs merged, key reviews completed, meaningful collaboration
 *    - In-flight: active PRs, review requests, “stuck” work patterns
 *    - Signals: long review waits, rework cycles, unusually large PRs, dependency stalls
 *
 * 2) Longer-window context (secondary window: 4–8 weeks depending on meeting type)
 *    - Work rhythm summary (focus fragmentation, deep work availability, meeting pressure)
 *    - Trend signals: drift toward coordination vs building, recurring slowdowns
 *    - Useful for “how it’s going” conversations without over-indexing on a single week
 *
 * 3) Calendar context (optional but strongly recommended)
 *    - Meeting load and fragmentation to contextualize output constraints
 *    - Upcoming high-stakes meetings (demo/design review/planning) that affect priorities
 *    - OOO signals that affect sequencing/expectations (only when relevant)
 *
 * What we explicitly do NOT assume:
 * - “Velocity” equals value; engineers can game throughput metrics.
 * - Managers have full context; they often do not, and they’re busy.
 * - Engineers should “vibe code” to look productive. Stability and leverage matter.
 *
 * Output:
 * The prep is structured into “talking points” with references, not paragraphs.
 * It aims to let the engineer pick the best 4–8 points for the actual conversation.
 *
 * Core sections (v1):
 *
 * 1) Highlights (wins / shipped outcomes)
 *    - Concrete accomplishments with traceable artifacts (PRs/reviews) and outcomes.
 *    - Prefer “what changed / who unblocked” over “what I worked on”.
 *    - If the week was meeting-heavy, we acknowledge constraints without making excuses.
 *
 * 2) Friction (what’s slowing progress)
 *    - Review stalls, dependency waits, unclear ownership, too much context switching,
 *      excessive meeting load, recurring rework patterns.
 *    - Friction is framed constructively: “here’s what would help” not “here’s who failed”.
 *
 * 3) Asks (specific support requested)
 *    - A decision, a priority call, help escalating a dependency, reviewing a PR,
 *      clarifying scope, getting time protected, getting introduced to someone, etc.
 *    - The best asks are small, crisp, and easy for the manager to act on quickly.
 *
 * 4) Collaboration (reviews, mentoring, cross-team contribution)
 *    - Many orgs undercount this; DevImpact should surface it when it’s real.
 *    - Includes: unblocking others, review throughput, onboarding support, knowledge sharing.
 *
 * 5) Focus / Direction (what matters next)
 *    - What the engineer intends to drive next and why it matters.
 *    - This is not a daily plan; it is “directional alignment”.
 *    - Helps avoid silent deprioritization or zombie projects slipping between cracks.
 *
 * 6) Growth (optional and non-preachy)
 *    - Only when it naturally appears: new domain, new system, better patterns.
 *    - We avoid forcing “growth content” every week. Engineers hate performative growth.
 *
 * Important behavioral guardrails:
 * - 1:1 prep should NOT become “status reporting theater”.
 * - Avoid generic “AI voice”. Prefer terse, grounded language.
 * - Do not guilt-trip about meetings. Treat meeting load as a constraint, not a flaw.
 * - Never present metrics as judgments. Treat them as signals for discussion.
 * - Don’t overfit to last 7 days; a bad week shouldn’t rewrite the story.
 *
 * Windows (how we choose time ranges):
 * - If recurring series is known:
 *    primary window = since last occurrence end (preferred)
 *    fallback = since last occurrence start
 * - If unknown/manual:
 *    default primary lookback:
 *      - oneOnOne: 7 days
 * - Secondary window:
 *    default 4–8 weeks depending on meetingType (e.g., 28 days for 1:1 v1)
 * - Clamp primary window (e.g., max 21 days) to avoid “kitchen sink” prep
 *
 * Success metrics (v1):
 * - “Opened before 1:1” conversion rate (within 2 hours of meeting start)
 * - Time-to-first-use < 5 minutes (prep generation + skim)
 * - Repeat usage across recurring 1:1s
 * - Qual feedback:
 *    - “Helped me remember wins”
 *    - “Helped me ask for what I needed”
 *    - “Felt accurate and non-cringe”
 *    - “Made 1:1 shorter / more useful”
 *
 * Future versions (only after v1 works):
 * - Counterpart modes: manager vs peer vs direct report (tone + sections adapt)
 * - “Open loops” tracking: decisions pending, follow-ups from last 1:1
 * - Light customization: what sections to emphasize, personal templates
 * - Promotion packet helpers: auto-collect a quarterly narrative from 1:1 highlights
 * - Stronger “support map”: who you’re blocked on / who depends on you (privacy-safe)
 *
 * Failure modes to avoid:
 * - Overly verbose output that feels like a blog post
 * - Generic advice that doesn’t tie to real work artifacts
 * - Metrics as a scoreboard (engineers will disengage or game it)
 * - “AI cheerleading” or pushing AI adoption narratives
 * - Turning 1:1 prep into HR-speak instead of practical engineering reality
 */
