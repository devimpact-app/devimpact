"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { StepHeader } from "../../components/StepHeader";

export default function VerifyTokenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgName = searchParams.get("org");

  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/github/pat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, orgName }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/onboarding/repos");
      } else {
        setError(data.error || "Invalid token. Please try again.");
        setSubmitting(false);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <OnboardingLayout>
      <StepHeader
        title="Paste Your Token"
        description="Copy the token from GitHub and paste it below."
      />

      <div className="bg-surface border border-border rounded-xl p-4 mb-6">
        <p className="text-sm mb-2">
          <strong>Still in GitHub?</strong> After "Generate token":
        </p>
        <ol className="list-decimal pl-6 text-sm text-text-secondary space-y-1">
          <li>Click copy icon next to token</li>
          <li>Return to this tab</li>
          <li>Paste below</li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="token" className="block text-sm font-medium mb-2">
            GitHub Personal Access Token
          </label>
          <input
            id="token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value.trim())}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            autoFocus
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="mt-2 text-xs text-text-tertiary">
            🔒 Encrypted and stored securely
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href={`/onboarding/pat?${searchParams.toString()}`}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm hover:bg-background/60"
          >
            ← Back
          </Link>
          <button
            type="submit"
            disabled={submitting || !token}
            className={`flex-1 rounded-xl px-4 py-3 font-semibold transition ${
              submitting || !token
                ? "bg-accent/60 cursor-not-allowed"
                : "bg-accent text-white hover:bg-accent-hover"
            }`}
          >
            {submitting ? "Verifying…" : "Connect GitHub"}
          </button>
        </div>
      </form>

      <div className="mt-6 border-t border-border pt-6">
        <p className="text-sm text-text-secondary mb-2">Having trouble?</p>
        <div className="flex gap-4 text-sm flex-wrap">
          <Link
            href={`/onboarding/pat?${searchParams.toString()}`}
            className="text-accent hover:underline"
          >
            Re-open GitHub
          </Link>
          <Link
            href={`/onboarding/cli?${searchParams.toString()}`}
            className="text-accent hover:underline"
          >
            Try CLI instead
          </Link>
        </div>
      </div>
    </OnboardingLayout>
  );
}
