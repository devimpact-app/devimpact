// USE 4w trailing, don't change w/ week selector
// Dashboard - always relative to now
// Insights page - change anchors/window

// Scoring system
// Rank by
// - how statistically strong
// - impact on workflow
// - novelty or non-triviality (small PRs merge faster might be obvious)
// - Recurrence
// - Personalizatiton (is it too generic of advice)

// 1. Fast loop PR patterns - timing in day/week, surface area, friction, etc
// 2. Themes that most frequently triggered change requests/review friction
// - Extend PR summary - include first non approving review specifically, ask prompt to give tags for that
// 3. Review bottlenecks - availability dead zones, reliance on specific reviewer, which tags (architecture for example) took longest

// Review friction
// Inputs: review themes, # of iterations, time to first review, files changed
// PRs with >= 2 rounds and recurring themes and high latency
// "Biggest friction this week came from test coverage feedback on multi round PRs"

// Review bottlenecks
// Not due to code, but reviewer business
// Long time to first review, but low iteration count, no major issues in themes

// Architecture misalignment
// Files changed, themes like architecture, structure, refactor, multiple iteration rounds

// Execution - what led to fast loops
// Look at PRs with fast ready to review to merge w/ low iteration count
// See if patterns like small surface area or small diff, or specific themes, or time of week

// High leverage refactor
// Lots of deletions, look at tags of change, quick turnaround

// Reviewer availability patterns
// When team is most responsive
// Show best windows, show dead zones (post 4pm on Fridays)
// Collect into insight - PRs you open before 11am get reviewed 40% faster
// OR PRs after 3pm often miss same day window

// High surface area -> high latency correlation

// Themes that most frequently led to change requests

// Codebase specific
// Most of recent work touches auth/session surface - becoming go-to
// Detect deep dives into specific modules

// Detect feedback improvements over time - testing feedback decreased as example

// Your review themes - most of feedback helped unblock front end PRs w/ state management

// Evening activity has been creeping up
