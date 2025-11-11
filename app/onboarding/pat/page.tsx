"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { StepHeader } from "../components/StepHeader";

export default function PatInstructionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ownerType = searchParams.get("type");
  const orgName = searchParams.get("org");

  const classicPatUrl = new URL("https://github.com/settings/tokens/new");
  classicPatUrl.searchParams.set("description", "DevImpact (read-only usage)");
  classicPatUrl.searchParams.set("scopes", "repo,user:email");

  const handleOpenGitHub = () => {
    window.open(classicPatUrl.toString(), "_blank");
    router.push(`/onboarding/pat/verify?${searchParams.toString()}`);
  };

  return (
    <OnboardingLayout>
      <StepHeader
        title="Create Your GitHub Token"
        description="We'll create a Classic Personal Access Token. Takes 2 minutes."
      />

      <div className="bg-background border border-border rounded-xl p-5 mb-6">
        <h3 className="font-semibold mb-3">When GitHub opens:</h3>
        <ol className="space-y-3 text-sm text-text-secondary">
          <li className="flex items-start">
            <span className="font-semibold mr-2">1.</span>
            <div>Name: "DevImpact" (or any name)</div>
          </li>
          <li className="flex items-start">
            <span className="font-semibold mr-2">2.</span>
            <div>Expiration: 90 days (recommended)</div>
          </li>
          <li className="flex items-start">
            <span className="font-semibold mr-2">3.</span>
            <div>
              Scope: Check ✓{" "}
              <span className="font-mono bg-surface px-1 rounded">repo</span>
            </div>
          </li>
          {ownerType === "org" && (
            <li className="flex items-start">
              <span className="font-semibold mr-2">4.</span>
              <div>
                Resource owner: Select{" "}
                <span className="font-mono bg-surface px-1 rounded">
                  {orgName}
                </span>
              </div>
            </li>
          )}
          <li className="flex items-start">
            <span className="font-semibold mr-2">
              {ownerType === "org" ? "5" : "4"}.
            </span>
            <div>Click "Generate token" and copy it</div>
          </li>
        </ol>
      </div>

      {/* Security note */}
      <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
        <h4 className="font-semibold text-sm mb-2">🔒 About "repo" scope</h4>
        <p className="text-sm text-text-secondary mb-2">
          Classic tokens require <span className="font-mono">repo</span> scope
          (includes write permissions).
        </p>
        <p className="text-sm text-text-secondary">
          <strong>We only use read-only API calls.</strong> Verify in our{" "}
          <a
            href="https://github.com/devimpact/sync"
            target="_blank"
            className="text-accent hover:underline"
          >
            open-source code
          </a>
          .
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href={`/onboarding/connect?${searchParams.toString()}`}
          className="rounded-xl border border-border bg-background px-4 py-3 text-sm hover:bg-background/60"
        >
          ← Back
        </Link>
        <button
          onClick={handleOpenGitHub}
          className="flex-1 bg-accent text-white rounded-xl px-4 py-3 font-semibold hover:bg-accent-hover"
        >
          Open GitHub →
        </button>
      </div>

      <p className="mt-4 text-xs text-text-tertiary text-center">
        Opens in new tab • Come back to paste your token
      </p>
    </OnboardingLayout>
  );
}
