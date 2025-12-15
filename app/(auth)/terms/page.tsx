export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary px-6 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>

        <p className="text-sm text-text-secondary">
          Last updated: December 2025 • DevImpact (operated by ExportLogic LLC)
        </p>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using DevImpact (the “Service”), you agree to these
            Terms of Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            2. Private Beta
          </h2>
          <p>
            DevImpact is currently in a closed, invite-only beta. Access may be
            granted or revoked at our discretion.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            3. Description of the Service
          </h2>
          <p>
            DevImpact analyzes activity data you choose to connect—such as
            GitHub metadata (pull requests, reviews, comments, and related
            metadata) and, if you enable it, Google Calendar read-only event
            metadata—to generate insights, summaries, and work patterns.
          </p>
          <p>DevImpact does not modify your GitHub or Google Calendar data.</p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            4. Beta Software Disclaimer
          </h2>
          <p>
            The Service is experimental and provided “as is.” DevImpact may
            contain bugs, may be incomplete, and may change or be discontinued
            without notice. No guarantees of accuracy, reliability, or uptime
            are provided.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            5. AI-Generated Insights
          </h2>
          <p>
            Some DevImpact features may generate summaries or suggestions using
            automated systems. These outputs may be inaccurate or incomplete and
            should not be relied on for critical decisions.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            6. User Responsibilities
          </h2>
          <p>You agree not to misuse the Service in any way, including:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Attempting to access other users’ data.</li>
            <li>Reverse engineering or copying the Service.</li>
            <li>Automating actions that overload or disrupt the Service.</li>
          </ul>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            7. Your Data
          </h2>
          <p>
            You give DevImpact permission to retrieve and analyze data from
            integrations you explicitly connect (such as GitHub and Google
            Calendar). You can revoke access at any time by disconnecting an
            integration in the app.
          </p>
          <p>
            See our{' '}
            <a href="/privacy" className="text-accent underline">
              Privacy Policy
            </a>{' '}
            for details.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            8. Intellectual Property
          </h2>
          <p>
            All DevImpact software and designs are owned by ExportLogic LLC. You
            retain ownership of your GitHub content and synced data.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            9. Termination
          </h2>
          <p>
            You may stop using DevImpact at any time. We may suspend access for
            misuse. Data may be deleted upon request.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            10. Limitation of Liability
          </h2>
          <p>
            To the fullest extent permitted by law, DevImpact and ExportLogic
            LLC are not liable for any damages arising from use of the Service.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            11. Governing Law
          </h2>
          <p>These Terms are governed by the laws of Arizona, USA.</p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed pb-12">
          <h2 className="text-base font-semibold text-text-primary">
            12. Contact
          </h2>
          <p>
            For questions or concerns, contact{' '}
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
