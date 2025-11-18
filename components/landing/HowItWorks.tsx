export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
            How the beta works
          </h2>
          <p className="mt-3 text-text-secondary text-lg">
            Built for individual engineers. No team setup required.
          </p>
        </div>

        <ol className="grid gap-6 md:grid-cols-3">
          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              1
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Connect via Github & CLI (2 min)
            </h3>
            <ul className="mt-4 space-y-1 text-sm text-text-secondary">
              <li>• Sign in with Github</li>
              <li>
                • Run npm @devimpact/cli init to let DevImpact privately read
                metadata
              </li>
              <li>
                • You stay in control - runs from your machine using official
                github auth
              </li>
            </ul>
          </li>

          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              2
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Sync your recent work
            </h3>
            <ul className="mt-4 space-y-1 text-sm text-text-secondary">
              <li>
                • DevImpact pulls your authored PRs and reviews from the last 3
                months
              </li>
              <li>
                • Computes helpful insights and a weekly work rythm pattern
              </li>
              <li>• See a full timeline and summary for recent weeks</li>
            </ul>
          </li>

          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              3
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Use it for 1:1s & reviews
            </h3>
            <ul className="mt-4 space-y-1 text-sm text-text-secondary">
              <li>
                • Generate summaries and skim your timeline and insights before
                1:1s
              </li>
              <li>• Export a rough review packet (coming soon)</li>
            </ul>
          </li>
        </ol>
      </div>
    </section>
  );
}
