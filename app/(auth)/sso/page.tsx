export default function SsoHelpPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary px-6 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold tracking-tight">
          GitHub SSO &amp; DevImpact
        </h1>

        <p className="text-sm text-text-secondary">
          Last updated: December 2025
        </p>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Does DevImpact work with SSO?
          </h2>
          <p>
            Yes. If your company uses GitHub Enterprise Cloud with Single
            Sign-On (SSO), DevImpact still works{' '}
            <span className="text-text-primary/90 font-medium">as long as</span>{' '}
            your GitHub CLI is authenticated with your SSO-enabled account.
          </p>
          <p>
            DevImpact never talks directly to your identity provider. We only
            communicate with GitHub&apos;s APIs via your local{' '}
            <code className="rounded bg-background/60 px-1 py-[1px] font-mono text-xs">
              gh
            </code>{' '}
            session.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Recommended setup (browser flow)
          </h2>
          <p>
            The simplest path for most SSO users is to authenticate via the
            browser using the official GitHub CLI:
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              In your browser, make sure you are:
              <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                <li>Signed into GitHub with your work account.</li>
                <li>
                  Signed into your company&apos;s SSO for that GitHub Enterprise
                  organization.
                </li>
              </ul>
            </li>
            <li>
              In your terminal, run:
              <div className="mt-1">
                <code className="rounded bg-background/60 px-2 py-[2px] font-mono text-xs">
                  gh auth login
                </code>
              </div>
            </li>
            <li>
              When prompted, choose{' '}
              <span className="font-medium text-text-primary/90">
                GitHub.com
              </span>{' '}
              and complete the browser-based auth flow.
            </li>
          </ol>
          <p>
            If you&apos;re already signed into your SSO-protected org in the
            browser, GitHub will route you through the correct SSO flow
            automatically.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            If you&apos;re having trouble with SSO
          </h2>
          <p>
            In some environments, the browser flow can be unreliable or tightly
            locked down. As a fallback, you can use a{' '}
            <span className="font-medium text-text-primary/90">
              Personal Access Token (PAT)
            </span>{' '}
            with SSO enabled:
          </p>

          <ol className="list-decimal list-inside space-y-2">
            <li>
              In your browser, visit{' '}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline"
              >
                https://github.com/settings/tokens
              </a>{' '}
              and create a new token with the scopes your company allows for
              CLI/API access.
            </li>
            <li>
              After creating the token, you should see an option to{' '}
              <span className="font-medium text-text-primary/90">
                &quot;Configure SSO&quot;
              </span>{' '}
              and authorize the token for your enterprise organization. This
              step is what lets the token access SSO-protected resources.
            </li>
            <li>
              In your terminal, run:
              <div className="mt-1 space-y-1">
                <code className="block rounded bg-background/60 px-2 py-[2px] font-mono text-xs">
                  gh auth login --with-token
                </code>
                <p className="text-[11px] text-text-secondary">
                  GitHub CLI will prompt you to paste the token. Once
                  that&apos;s complete and SSO is authorized, DevImpact will be
                  able to read your PR and review metadata via{' '}
                  <code className="rounded bg-background/60 px-1 py-[1px] font-mono text-[10px]">
                    gh api
                  </code>
                  .
                </p>
              </div>
            </li>
          </ol>

          <p>
            For more detail on authorizing a token with SSO, see GitHub&apos;s
            official documentation:{' '}
            <a
              href="https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-single-sign-on/authorizing-a-personal-access-token-for-use-with-single-sign-on"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline"
            >
              Authorizing a personal access token for use with single sign-on
            </a>
            .
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            How DevImpact uses your GitHub access
          </h2>
          <p>
            DevImpact never sees your SSO credentials directly. We rely entirely
            on your local GitHub CLI session for authentication and only read:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Pull request metadata (titles, numbers, timestamps, reviews).
            </li>
            <li>Review and comment bodies (sanitized for insights).</li>
            <li>Commit metadata and file-level statistics.</li>
          </ul>
          <p>
            We don&apos;t see your password, IdP credentials, or raw code
            contents, and you can revoke access at any time through GitHub or by
            logging out of{' '}
            <code className="rounded bg-background/60 px-1 py-[1px] font-mono text-[10px]">
              gh
            </code>
            .
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-base font-semibold text-text-primary">
            Still stuck?
          </h2>
          <p>
            If you&apos;re unsure whether your organization uses SSO, or you
            can&apos;t get{' '}
            <code className="rounded bg-background/60 px-1 py-[1px] font-mono text-[10px]">
              gh auth login
            </code>{' '}
            working with DevImpact, reach out and we&apos;ll help you debug it.
          </p>
          <p>
            Contact us at{' '}
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
