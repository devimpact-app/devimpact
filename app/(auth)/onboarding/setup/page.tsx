"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { StepHeader } from "../components/StepHeader";

export default function SetupPage() {
  const router = useRouter();
  const [ownerType, setOwnerType] = useState<"org" | "personal" | null>(null);
  const [orgName, setOrgName] = useState("");

  const handleContinue = () => {
    const params = new URLSearchParams();
    params.set("type", ownerType!);
    if (ownerType === "org") {
      params.set("org", orgName);
    }
    router.push(`/onboarding/connect?${params.toString()}`);
  };

  return (
    <OnboardingLayout>
      <StepHeader
        title="Connect Your GitHub"
        description="Let's start by understanding where you want to track contributions."
      />

      <label className="mb-2 block text-md font-medium">
        Where do you want to track contributions from?
      </label>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {/* Organization Option */}
        <div
          onClick={() => setOwnerType("org")}
          className={`cursor-pointer rounded-xl border px-4 py-3 transition ${
            ownerType === "org"
              ? "border-accent bg-accent/10"
              : "border-border bg-surface hover:bg-background/60"
          }`}
        >
          <div className="font-medium">Organization</div>
          <div className="text-sm text-text-secondary">
            Company repos (e.g. <span className="font-mono">acme/project</span>)
          </div>
        </div>

        {/* Personal Option */}
        <div
          onClick={() => setOwnerType("personal")}
          className={`cursor-pointer rounded-xl border px-4 py-3 transition ${
            ownerType === "personal"
              ? "border-accent bg-accent/10"
              : "border-border bg-surface hover:bg-background/60"
          }`}
        >
          <div className="font-medium">Personal</div>
          <div className="text-sm text-text-secondary">
            Your repos (e.g. <span className="font-mono">you/project</span>)
          </div>
        </div>
      </div>

      {ownerType === "org" && (
        <div className="mb-6">
          <label htmlFor="orgSlug" className="mb-1 block text-md">
            Organization slug
          </label>
          <input
            id="orgSlug"
            autoFocus
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="e.g., acme"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="mt-1 text-xs text-text-tertiary">
            The part before the slash in{" "}
            <span className="font-mono">org/repo</span>
          </p>
        </div>
      )}

      {ownerType !== null && (
        <button
          onClick={handleContinue}
          disabled={ownerType === "org" && !orgName.trim()}
          className={`w-full rounded-xl px-4 py-3 font-semibold transition ${
            ownerType === "org" && !orgName.trim()
              ? "bg-surface text-text-secondary cursor-not-allowed"
              : "bg-accent text-white hover:bg-accent-hover"
          }`}
        >
          Continue →
        </button>
      )}
    </OnboardingLayout>
  );
}
