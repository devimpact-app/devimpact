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
            Set up is clear and takes less than 5 minutes
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
              <li>• Sign in with Github</li>
              <li>• Run a quick sync to pull recent work</li>
              <li>
                • Optionally connect Google Calendar to improve context and
                preparation
              </li>
              <li>
                <b>• Private by default — no team setup, no managers</b>
              </li>
            </ul>
          </li>

          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              2
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Get a clearer picture of your work
            </h3>
            <p className="text-sm text-text-secondary mt-4">
              See how your work, meetings, and follow-ups actually add up over
              time — without having to reconstruct it yourself.
            </p>
            {/* <ul className="mt-4 space-y-1 text-sm text-text-secondary">
              <li>• Where your best focus time actually happens</li>
              <li>• How meetings and reviews reshape your week</li>
              <li>
                • A weekly record of shipped work and follow-ups — delivered to
                your inbox
              </li>
              <li>• Early signs of drift before they surface in reviews</li>
            </ul> */}
          </li>

          <li className="group rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent)]">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
              3
            </div>
            <h3 className="text-lg font-semibold text-text-primary">
              Walk into meetings prepared
            </h3>
            <p className="text-sm text-text-secondary mt-4">
              Go into 1:1s and standups with clear talking points, grounded in
              what you’ve actually been working on.
            </p>
            {/* <ul className="mt-4 space-y-1 text-sm text-text-secondary">
              <li>
                • Go into 1:1s with a clear narrative: wins, blockers, themes
              </li>
              <li>
                • Show what’s blocking output: meetings, review load, context
                switching
              </li>
              <li>• Build a running record you can reuse when it matters</li>
            </ul> */}
          </li>
        </ol>
      </div>
    </section>
  );
}
