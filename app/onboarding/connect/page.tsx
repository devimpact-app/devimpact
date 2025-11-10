"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { StepHeader } from "../components/StepHeader";

export default function ConnectPage() {
  const searchParams = useSearchParams();

  const webUrl = `/onboarding/pat?${searchParams.toString()}`;
  const cliUrl = `/onboarding/cli?${searchParams.toString()}`;

  return (
    <OnboardingLayout>
      <StepHeader
        title="How would you like to connect?"
        description="Both options are secure. Choose based on convenience vs. local control."
      />

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Web Setup */}
        <Link
          href={webUrl}
          className="block rounded-xl border border-border bg-surface p-6 hover:border-accent hover:bg-accent/5 transition"
        >
          <div className="text-3xl mb-3">🌐</div>
          <h3 className="text-lg font-semibold mb-2">
            Web Setup
            <span className="ml-2 text-xs font-normal px-2 py-1 rounded-full bg-accent/20 text-accent">
              Recommended
            </span>
          </h3>
          <ul className="text-sm text-text-secondary space-y-2 mb-4">
            <li>• Quick (30 seconds)</li>
            <li>• Automatic syncing</li>
            <li>• No approval needed</li>
          </ul>
          <div className="text-accent text-sm font-medium">
            Continue with Web →
          </div>
        </Link>

        {/* CLI Setup */}
        <Link
          href={cliUrl}
          className="block rounded-xl border border-border bg-surface p-6 hover:border-accent hover:bg-accent/5 transition"
        >
          <div className="text-3xl mb-3">💻</div>
          <h3 className="text-lg font-semibold mb-2">
            CLI Setup
            <span className="ml-2 text-xs font-normal px-2 py-1 rounded-full bg-surface-alt text-text-secondary">
              Advanced
            </span>
          </h3>
          <ul className="text-sm text-text-secondary space-y-2 mb-4">
            <li>• Maximum security</li>
            <li>• Token stays local</li>
            <li>• No approval needed</li>
          </ul>
          <div className="text-accent text-sm font-medium">Use CLI →</div>
        </Link>
      </div>

      <Link
        href="/onboarding/setup"
        className="mt-6 inline-block text-sm text-text-secondary hover:text-text-primary"
      >
        ← Back
      </Link>
    </OnboardingLayout>
  );
}
