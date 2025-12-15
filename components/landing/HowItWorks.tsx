export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative bg-background border-t border-white/5 + bg-gradient-to-b from-indigo-500/5 to-transparent"
    >
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
            How the beta works
          </h2>
          <p className="mt-3 text-text-secondary text-lg">
            Set up in minutes. Get a clear view of your time, focus, and impact.
          </p>
        </div>

        <ol className="grid gap-6 md:grid-cols-3">
          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              1
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Connect your work data (2-5 mins)
            </h3>
            <ul className="mt-4 space-y-1 text-sm text-text-secondary">
              <li>• Sign in with Github (work or personal)</li>
              <li>• Run the CLI once to sync your activity metadata</li>
              <li>
                • Optional: connect Google Calendar to map meeting load + deep
                work time
              </li>
              <li>• Your data stays private - no team setup, no managers </li>
            </ul>
          </li>

          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              2
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Get your leverage signals
            </h3>
            <ul className="mt-4 space-y-1 text-sm text-text-secondary">
              <li>• Your work rhythm: where focus time actually happens</li>
              <li>
                • Meeting pressure overlay (calendar beta) + deep work blocks
              </li>
              <li>
                • Weekly summary: shipped work + follow-ups you can use in 1:1s
              </li>
              <li>
                • Trends over time (Ex: drift toward coordination vs building)
              </li>
            </ul>
          </li>

          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              3
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Use it before 1:1s, reviews, and planning
            </h3>
            <ul className="mt-4 space-y-1 text-sm text-text-secondary">
              <li>
                • Walk into 1:1s with a clean narrative: wins, blockers, themes
              </li>
              <li>
                • Spot what’s blocking output: meetings, review load, context
                switching
              </li>
              <li>
                • Protect your best windows and adjust your week before it
                drifts
              </li>
              <li>• Export/share a packet (optional — coming soon)</li>
            </ul>
          </li>
        </ol>
      </div>
    </section>
  );
}
