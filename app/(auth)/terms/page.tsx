export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary px-6 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>

        <p className="text-sm text-text-secondary">
          Last updated: January 2026
        </p>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <p>
            DevImpact is a personal project built by Ian Richard. By using it,
            you agree to these terms.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            What DevImpact does
          </h2>
          <p>
            DevImpact connects to GitHub and Google Calendar (if you choose) to
            analyze your work activity. It creates summaries, meeting prep, and
            organizes your work into threads. It doesn't modify any of your
            data.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            This is demo software
          </h2>
          <p>
            DevImpact is provided "as is" with no guarantees. It's experimental
            software that may have bugs, change without notice, or be
            discontinued. Don't rely on it for critical work.
          </p>
          <p>
            Data may be reset periodically as I continue development. Back up
            anything important.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            AI-generated content
          </h2>
          <p>
            Some features use AI to generate summaries and insights. These may
            be inaccurate or incomplete. Review them before using them for
            important decisions.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Your responsibilities
          </h2>
          <p>Don't:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Try to access other people's data</li>
            <li>Abuse or overload the service</li>
            <li>Use it for anything illegal</li>
          </ul>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Your data
          </h2>
          <p>
            You give DevImpact permission to access and analyze data from GitHub
            and Google Calendar when you connect them. You can disconnect
            anytime from settings.
          </p>
          <p>
            See the{' '}
            <a href="/privacy" className="text-accent underline">
              Privacy Policy
            </a>{' '}
            for details on how your data is used.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Ownership
          </h2>
          <p>You own your data. I own the DevImpact software and design.</p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Stopping use
          </h2>
          <p>
            You can stop using DevImpact anytime. Disconnect your integrations
            or email me to delete your account and data.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Liability
          </h2>
          <p>
            DevImpact is provided as-is with no warranties. I'm not responsible
            for any issues that arise from using it.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed pb-12">
          <h2 className="text-base font-semibold text-text-primary">
            Questions?
          </h2>
          <p>
            Email me at{' '}
            <a
              href="mailto:ian@devimpact.app"
              className="text-accent underline"
            >
              ian@devimpact.app
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
