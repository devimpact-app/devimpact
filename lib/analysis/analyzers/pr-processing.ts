// Example of logic

// For our authored PRs
// Pull all PRs that haven't been processed yet - in normalized table but not analytics table?
// For each one we want
// Time to first review
// Other phases - waiting for review, addressing feedback, time to merge, total time for whole PR
// Don't count while it was draft
// Approved on first review
// Number of comments
// Number of reviews until approval?
// Number of unique reviewers?
// Requested reviewers - can we get only from timeline events? Or does it sometimes only exist on PR object? And would we need extra API call or permissions?
// File extensions breakdown - # of files, % of PR
// Total additions/deletions
// How to handle if review, then back into draft status, then back open and waiting again?
// Closed PRs - percentage, reviewed beforehand?

// For our reviewed PRs
// How long for us to review after requested (discount draft status)
// How many comments did we leave
// File extensions of PR - what have wwe been reviewing
// Type of review(s) we left
// % of different status
// times we commented then never came back to approve

// Advanced analytics
// For our PRs, time to open, time to first review, time for feedback, total time to merge
// % approved on first review
// Average number of comments on our PRs
// Avg number of reviews until approval, avg number of unique reviewers
// Language breakdown of the PR - what have we been working on?
// Total lines shipped
// How often we have a PR that gets ultra stuck, closed or merged after 15-30 days etc
// How long does it take for us to review a PR
// Whos PRs do we review the most
// What does our avg review look like - # of comments and type of review
// How often do we leave people hanging - give feedback, then not approve after requested again

// AI analytics
// What are typical PR comments on our code like? What's the theme? Gives us clue of what to work on
// What are biggest reasons why our code not approved on first review? Can we extract?
// Learning journey - what languages have we been learning over time?
// How much team time does it take to get our PRs through - including others time
// Who do we collaborate with the most?
// How in-depth are our reviews?
// What kind of PRs do we typically review? and not review? Are we only doin the shallow ones? Only certain languages?
// How often do we lose track of something?
// AI summaries of our authored PRs, for brag sheets and themes
// AI summaries of our code review comments on others, what we leave feedback on
// What do we need to do to grow as an engineer (from our inputted goals)

// Calendar - confirm access?
// Meeting load for the week, avg time per day (standard), focus time per day (more than 30 min blocks)
// Who do we meet with most often?
// What are most common types of meetings? What do we spend most time on?

// Calendar + github
// What are most productive times of day and of the week? How do meetings impact? Help engineer make a case to skip meetings
// How much focus time needed - when there's 30 min blocks do they get anything done coding?
// Working hours
// Burnout risk detection
// What are best times to block your calendar
// How long to get going again after a meeting is over?
