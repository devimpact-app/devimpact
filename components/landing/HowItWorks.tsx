export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative">
      <div className="mx-auto max-w-5xl px-6 py-20">
        {/* Section header */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
            How DevImpact Works
          </h2>
          <p className="mt-3 text-text-secondary text-lg">
            Your private impact coach that learns from your work and helps you
            grow your craft, collaboration, and focus.
          </p>
        </div>

        {/* Steps */}
        <ol className="grid gap-6 md:grid-cols-3">
          {/* Step 1 */}
          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              1
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Connect your work
            </h3>
            <p className="mt-2 text-text-secondary">
              Connect your GitHub account to unlock your personal impact
              dashboard. DevImpact privately analyzes your work activity like
              pull requests and reviews to help you see your growth over time.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-text-secondary/90">
              <li>• Required: GitHub (for code activity)</li>
              <li>
                • Optional: calendar, task tools, or notes for richer insights
              </li>
              <li>• Private by design — data is visible only to you</li>
            </ul>
          </li>

          {/* Step 2 */}
          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              2
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Reflect & capture
            </h3>
            <p className="mt-2 text-text-secondary">
              DevImpact turns day-to-day work into clear wins: accomplishments,
              collaboration, mentorship, and deep-work time — organized for you.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-text-secondary/90">
              <li>• Quick daily notes or automatic nudges</li>
              <li>• Highlights across PRs, reviews, docs, and planning</li>
              <li>• Focus time trends without judgment</li>
            </ul>
          </li>

          {/* Step 3 */}
          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              3
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Grow with insights
            </h3>
            <p className="mt-2 text-text-secondary">
              Convert your progress into stories, goals, and next steps — ready
              for 1:1s, promotions, or just getting better week by week.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-text-secondary/90">
              <li>• Auto-drafted wins & growth stories</li>
              <li>• Goals and gentle accountability</li>
              <li>• Share only what you want</li>
            </ul>
          </li>
        </ol>

        {/* Privacy reassurance */}
        <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-border bg-surface/60 px-5 py-4 text-center text-sm text-text-secondary backdrop-blur">
          Private workspace. No team access required. You control integrations
          and sharing.
        </div>
      </div>
    </section>
  );
}
