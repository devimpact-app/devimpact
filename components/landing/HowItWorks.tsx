export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative bg-background border-t border-white/5 + bg-gradient-to-b from-indigo-500/5 to-transparent"
    >
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
            How it works
          </h2>
          <p className="mt-3 text-text-secondary text-lg">
            DevImpact automatically captures your work from GitHub and Google
            Calendar — turning it into organized summaries and meeting prep.
          </p>
        </div>

        <ol className="grid gap-6 md:grid-cols-3">
          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              1
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Automatic tracking
            </h3>
            <p className="text-sm text-text-secondary mt-4">
              Syncs with GitHub and Google Calendar to capture commits, PRs,
              pull request reviews, and meetings. No manual input required.
            </p>
          </li>

          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              2
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              AI-powered organization
            </h3>
            <p className="text-sm text-text-secondary mt-4">
              Groups your work into threads and generates summaries
              automatically. Always know what you've been working on without
              digging through Git history.
            </p>
          </li>

          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              3
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Ready when you need it
            </h3>
            <p className="text-sm text-text-secondary mt-4">
              Prepares talking points before 1:1s and standups based on your
              recent work. Get weekly recaps to stay on top of what you've
              shipped.
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}
