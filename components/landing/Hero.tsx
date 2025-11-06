// components/Hero.tsx
export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft background glow */}
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
        <h1 className="mt-6 text-6xl font-extrabold leading-tight tracking-tight text-text-primary">
          Track what{" "}
          <span className="bg-accent/20 px-2 rounded-xl">really</span> matters
          in your engineering journey
        </h1>

        <p className="mx-auto mt-5 max-w-3xl text-2xl text-text-secondary">
          DevImpact is your personal impact coach — helping you grow your craft,
          strengthen collaboration, protect focus time, and reflect with
          clarity. All in your private workspace.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Start Tracking My Impact
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 font-medium text-text-primary hover:border-[oklch(0.65_0.05_255)]"
          >
            See how it works
          </a>
        </div>

        {/* tiny trust row */}
        <p className="mt-6 text-sm text-text-secondary">
          Private by default · You control what’s shared. No team access
          required.
        </p>
      </div>
    </section>
  );
}
