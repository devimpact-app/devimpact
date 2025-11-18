export default function BetaRequestPage() {
  return (
    <main className="min-h-screen bg-background text-text-primary flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full rounded-2xl border border-border bg-surface-alt p-8 shadow-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Request beta access
        </h1>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          DevImpact is currently in a private beta for individual engineers.
          Request access and we’ll send you a join code as we onboard users.
        </p>

        <div className="mt-6 rounded-xl overflow-hidden border border-white/10">
          <iframe
            src="https://tally.so/embed/Pdd2db?alignLeft=1&hideTitle=1&dynamicHeight=1"
            width="100%"
            height="600"
            className="rounded-xl"
            title="DevImpact beta request form"
          ></iframe>
        </div>
      </div>
    </main>
  );
}
