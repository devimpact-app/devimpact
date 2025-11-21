export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary px-6 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>

        <p className="text-sm text-text-secondary">
          Last updated: November 2025 • DevImpact (operated by ExportLogic LLC)
        </p>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Overview
          </h2>
          <p>
            DevImpact is an early private beta. We collect only the data
            required to generate your engineering insights and never sell or
            share your data with third parties.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Information We Collect
          </h2>
          <p>To provide DevImpact’s features, we collect:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your GitHub account information (login, name, email).</li>
            <li>
              Your GitHub OAuth token with name and email scopes only (for login
              only)
            </li>
            <li>
              Activity data from GitHub (pull requests, reviews, comments,
              timeline events, and related metadata).
            </li>
            <li>Basic usage data related to syncing and onboarding.</li>
          </ul>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            How We Use Your Information
          </h2>
          <p>Your data is used solely to power DevImpact’s features:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your weekly pulse and engineering patterns.</li>
            <li>Work rhythm heatmaps.</li>
            <li>1:1 prep and highlight summaries.</li>
            <li>Collaboration, review behavior, and trend insights.</li>
            <li>Timeline and activity analysis.</li>
          </ul>
          <p>
            We do not sell, rent, or share your data with any third parties.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Data Access & Deletion
          </h2>
          <p>
            You may request a copy of your data or ask for deletion at any time.
            We will remove all associated records within 7 days.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Security
          </h2>
          <p>
            Access to your data is restricted to the DevImpact engineering team.
            OAuth tokens are stored securely and rotated as required.
          </p>
        </section>

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

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">Contact</h2>
          <p>
            If you have questions or requests, contact us at{" "}
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
