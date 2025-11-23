// TODO future: preload enough content in sync for last week or two of summary cards

// Header
// Week label
// One line headline (can be rule-based for now, Ex: lighter coding week, lots of impact from reviews)

// Lightweight stats row - prs shipped and reviewed, active coding days, most active day

// What you shipped (2-3 PRs from week w summaries (short summary) annotate with tags also

// Where you spent time - domains/skills, ratio of authored to reviewed, try not to overlap much w/ work rythm card

// Reviewer role
// High impact PRs you reviewed w summaries
// Stats about first responder

// Friction
// Iteration heavy PRs
// Slow reviews as author or reviewer
// Recurring feedback themes (future)

// 1:1 prep CTA

// Logic: how to pick PRS
// Authored - merged during week
// Calculate impact score - using lines changed, files changed, comment count
// Calculate friction score - iterations count, review latency days, comments on changes requested, etc
// Sort by impact and friction score
// If only 2 or less, just show those

// Reviewed - submitted during week
// Calculate contribution score - comments #, was first reviewer, requested changes
// Pick top ones by score

// Also gets top tags for week
// Aggregate across authored PRs and received reviews - feed into friction/follows ups

// Edge cases
// Nothing authored - no prs merged, most of impact from reviews and exploration
// Nothing reviewed - lean more on authored and rythm
// Very low activity overall - was a light github week, time may have been spent elsewhere
