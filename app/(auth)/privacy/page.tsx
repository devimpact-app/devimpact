export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary px-6 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>

        <p className="text-sm text-text-secondary">
          Last updated: December 2025 • DevImpact (operated by ExportLogic LLC)
        </p>

        {/* Overview */}
        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Overview
          </h2>
          <p>
            DevImpact is an early private beta. We collect only the data
            required to generate your engineering insights and never sell, rent,
            or share your data with third parties.
          </p>
        </section>

        {/* Information We Collect */}
        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Information We Collect
          </h2>
          <p>To provide DevImpact’s features, we collect:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your GitHub account information (login, name, email).</li>
            <li>
              A GitHub OAuth token with basic identity scopes (used for login
              and account linking only).
            </li>
            <li>
              Activity metadata from GitHub, including pull requests, reviews,
              comments, timeline events, and related metadata.
            </li>
            <li>Basic usage data related to syncing and onboarding.</li>
          </ul>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Google Calendar Data
          </h2>

          <p>
            If you choose to connect Google Calendar, DevImpact accesses your
            calendar data using read-only permissions, only after your explicit
            consent.
          </p>

          <p>We access the following Google Calendar data:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Calendar IDs and calendar names</li>
            <li>Event start and end times</li>
            <li>
              Event metadata such as title, organizer status and attendee counts
            </li>
          </ul>

          <p>
            We <strong>do not</strong> access full event descriptions, notes,
            attachments, or modify your calendar in any way.
          </p>

          <p>
            This data is used solely to analyze meeting load, focus time, and
            work patterns in order to generate productivity and work rhythm
            insights for you.
          </p>

          <p>
            Google Calendar data is never used for advertising, marketing, or
            sold or shared with third parties.
          </p>

          <p>
            DevImpact’s use of information received from Google APIs adheres to
            the Google API Services User Data Policy, including the Limited Use
            requirements.
          </p>
        </section>

        {/* How We Use Your Information */}
        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            How We Use Your Information
          </h2>
          <p>Your data is used solely to power DevImpact’s features:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your weekly pulse and engineering patterns</li>
            <li>Work rhythm and focus-time analysis</li>
            <li>1:1 preparation and highlight summaries</li>
            <li>Collaboration, review behavior, and trend insights</li>
            <li>Timeline and activity analysis</li>
          </ul>
          <p>
            We do not sell, rent, or share your data with any third parties.
          </p>
        </section>

        {/* Data Access & Deletion */}
        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Data Access & Deletion
          </h2>
          <p>
            You may disconnect integrations or request deletion of your data at
            any time. Upon disconnection of Google Calendar, associated calendar
            data is deleted or no longer used for analysis.
          </p>
          <p>
            We will remove all associated records within 7 days of a deletion
            request.
          </p>
        </section>

        {/* Security */}
        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Security
          </h2>
          <p>
            Access to your data is restricted to authorized DevImpact systems.
            OAuth tokens and related credentials are stored securely. Data is
            encrypted in transit and at rest.
          </p>
        </section>

        {/* Beta Notice */}
        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Beta Software Notice
          </h2>
          <p>
            DevImpact is experimental beta software and may change or be
            discontinued without notice. We recommend not relying on it for
            critical workflows.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">Contact</h2>
          <p>
            If you have questions or requests, contact us at{' '}
            <a
              href="mailto:ian@devimpact.app"
              className="text-accent underline"
            >
              ian@devimpact.app
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
