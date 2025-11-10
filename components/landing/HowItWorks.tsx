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
            Connect GitHub. Track your contributions. Get recognized for your
            work.
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
              Connect your GitHub account (and optionally Google Calendar) in 30
              seconds. DevImpact automatically syncs your PRs, code reviews, and
              contributions—privately and securely.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-text-secondary/90">
              <li>• Required: GitHub (for code activity)</li>
              <li>• Optional: Google Calendar (for meeting context)</li>
              <li>• Private by design — data is visible only to you</li>
            </ul>
          </li>

          {/* Step 2 */}
          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              2
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Track Your Impact
            </h3>
            <p className="mt-2 text-text-secondary">
              DevImpact organizes your work into a clear timeline: what you
              built, who you collaborated with, and how your skills evolved over
              time.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-text-secondary/90">
              <li>• PRs and reviews automatically documented</li>
              <li>• Projects auto-categorized by theme</li>
              <li>• See your growth quarter over quarter</li>
            </ul>
          </li>

          {/* Step 3 */}
          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              3
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Share When You're Ready
            </h3>
            <p className="mt-2 text-text-secondary">
              Generate polished review docs in 30 seconds. Choose what to
              share—for performance reviews, promotion packets, or career
              conversations.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-text-secondary/90">
              <li>• AI-generated summaries of your work</li>
              <li>• Export formatted docs (markdown, PDF)</li>
              <li>• Share only what you want</li>
              <li>• Perfect for 1:1s, reviews, and job searches</li>
            </ul>
          </li>
        </ol>
      </div>
    </section>
  );
}
