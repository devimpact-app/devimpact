export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary px-6 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-text-secondary">
          Last updated: January 2026
        </p>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <p>
            DevImpact is a personal project built by Ian Richard. If you choose
            to try it out, here's what happens with your data.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            What we collect
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>GitHub data:</strong> Your commits, pull requests,
              reviews, and basic profile info (username, email)
            </li>
            <li>
              <strong>Google Calendar data:</strong> Event titles, times, and
              attendee counts (if you connect it). We don't access event
              descriptions or notes.
            </li>
            <li>
              <strong>Usage data:</strong> What features you use and when you
              sync
            </li>
          </ul>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            How we use it
          </h2>
          <p>Your data is used to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Generate weekly summaries and meeting prep</li>
            <li>Show your work patterns and activity timeline</li>
            <li>Organize your work into searchable threads</li>
          </ul>
          <p className="mt-4">
            <strong>We don't:</strong> Share, sell, or use your data for
            anything other than making DevImpact work. No ads, no marketing, no
            third parties.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Your data, your control
          </h2>
          <p>
            You can disconnect GitHub or Google Calendar anytime from your
            settings. If you want to delete everything, email me and I'll remove
            it within a week.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Security
          </h2>
          <p>
            Your data is encrypted in transit and at rest. OAuth tokens are
            stored securely and never logged or shared.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            This is a demo project
          </h2>
          <p>
            DevImpact is a side project I built to explore engineering
            productivity. It works, but it's not a commercial service. Data
            might be reset occasionally as I continue development. Don't rely on
            it for mission-critical work.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
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

        <section className="pt-6 border-t border-border/50 text-xs text-text-secondary/70">
          <p>
            DevImpact's use of information received from Google APIs adheres to
            the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text-secondary"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>
      </div>
    </div>
  );
}
