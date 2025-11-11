"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { StepHeader } from "../components/StepHeader";

export default function CliSetupPage() {
  const searchParams = useSearchParams();

  const classicPatUrl = new URL("https://github.com/settings/tokens/new");
  classicPatUrl.searchParams.set("description", "DevImpact");
  classicPatUrl.searchParams.set("scopes", "repo");

  return (
    <OnboardingLayout>
      <StepHeader
        title="CLI Setup"
        description="Your token never leaves your machine. Perfect for enterprise security."
      />

      {/* Step 1 */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Step 1: Install CLI</h3>
        <div className="bg-background rounded-xl border border-border p-4 mb-2">
          <code className="text-sm font-mono text-accent">
            npm install -g devimpact-cli
          </code>
        </div>
        <p className="text-sm text-text-secondary mb-2">Or use npx:</p>
        <div className="bg-background rounded-xl border border-border p-4">
          <code className="text-sm font-mono text-accent">
            npx devimpact setup
          </code>
        </div>
      </div>

      {/* Step 2 */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Step 2: Create Token</h3>
        <p className="text-sm text-text-secondary mb-3">
          Classic PAT with <span className="font-mono">repo</span> scope:
        </p>
        <button
          onClick={() => window.open(classicPatUrl.toString(), "_blank")}
          className="rounded-xl border border-accent bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
        >
          Open GitHub →
        </button>
      </div>

      {/* Step 3 */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Step 3: Run Setup</h3>
        <div className="bg-background rounded-xl border border-border p-4 mb-2">
          <code className="text-sm font-mono text-accent">devimpact setup</code>
        </div>
        <p className="text-sm text-text-secondary">
          Follow CLI prompts to connect.
        </p>
      </div>

      {/* Docs */}
      <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
        <p className="text-sm mb-2">
          <strong>Need help?</strong>
        </p>
        <a
          href="/docs/cli"
          target="_blank"
          className="text-sm text-accent hover:underline"
        >
          View full CLI docs →
        </a>
      </div>

      <Link
        href={`/onboarding/connect?${searchParams.toString()}`}
        className="text-sm text-text-secondary hover:text-text-primary"
      >
        ← Back to options
      </Link>
    </OnboardingLayout>
  );
}
