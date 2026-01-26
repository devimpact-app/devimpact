export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden px-6 pt-44 pb-28">
      {/* Background layers */}
      <div className="absolute inset-0 -z-10">
        {/* Base */}
        <div className="absolute inset-0 bg-[#070A12]" />

        {/* Top soft wash (adds separation from pure black) */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-transparent to-black/40" />

        {/* Primary aura (behind headline) */}
        <div
          className="
      absolute left-1/2 top-[32%]
      h-[900px] w-[900px]
      -translate-x-1/2 -translate-y-1/2
      rounded-full blur-3xl
      opacity-100
    "
          style={{
            background:
              'radial-gradient(circle at center, rgba(99,102,241,0.38) 0%, rgba(99,102,241,0.14) 15%, rgba(99,102,241,0.00) 50%)',
          }}
        />

        {/* Secondary aura (subtle depth / “aura spill”) */}
        <div
          className="
      absolute left-[55%] top-[18%]
      h-[700px] w-[700px]
      -translate-x-1/2 -translate-y-1/2
      rounded-full blur-3xl
      opacity-90
    "
          style={{
            background:
              'radial-gradient(circle at center, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0.06) 40%, rgba(56,189,248,0.00) 72%)',
          }}
        />

        {/* Bottom vignette (keeps edges clean) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl text-center flex flex-col items-center gap-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          For software engineers
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white">
          A memory for your engineering work
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-white/80 leading-relaxed">
          Weekly summaries, meeting prep, and work organized over time — so you
          don’t lose track of what you worked on.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
          <a
            href="mailto:ian@devimpact.app"
            className="
              rounded-lg bg-blue-500 px-6 py-3
              text-sm font-semibold text-white
              hover:bg-blue-400 transition
            "
          >
            Interested? Reach out
          </a>
        </div>
      </div>
    </section>
  );
}
