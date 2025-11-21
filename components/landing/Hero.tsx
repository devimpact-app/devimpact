export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute -top-40 left-1/2 h-160 w-160 -translate-x-1/2 rounded-full blur-3xl opacity-30"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-accent), transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-14 text-center">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
          A clearer view of your work as an engineer
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-[#9AA4C6]">
          DevImpact pulls from your GitHub activity to show how you work, when
          you focus best, and what you’ve shipped recently — so reviews and 1:1s
          are easier, not a scramble.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href="/beta-request"
            className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Request beta access
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 font-medium text-text-primary hover:border-[oklch(0.65_0.05_255)]"
          >
            See how it works
          </a>
        </div>

        <p className="mt-3 text-[11px] text-[#9AA4C6]">
          Early private beta • Individual engineers only • We’ll email you a
          setup link if there’s a good fit.
        </p>
      </div>
    </section>
  );
}
