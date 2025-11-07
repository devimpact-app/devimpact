"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PatSetup() {
  const router = useRouter();

  const [step, setStep] = useState<"intro" | "paste-token">("intro");
  const [ownerType, setOwnerType] = useState<"org" | "personal" | null>(null);
  const [orgName, setOrgName] = useState("");
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const patUrl = new URL(
    "https://github.com/settings/personal-access-tokens/new",
  );
  patUrl.searchParams.set("name", "Career Tracking");
  patUrl.searchParams.set(
    "description",
    "Track contributions for performance reviews",
  );
  patUrl.searchParams.set("expires_in", "90");
  patUrl.searchParams.set("pull_requests", "read");
  patUrl.searchParams.set("metadata", "read");
  patUrl.searchParams.set("issues", "read");

  // Only set target_name if user provided org
  if (orgName) {
    patUrl.searchParams.set("target_name", orgName);
  }

  const handleOpenGitHub = () => {
    // Open GitHub in new tab
    window.open(patUrl.toString(), "_blank");

    // Move to next step
    setStep("paste-token");
  };

  const handleSubmitToken = async (e: React.FormEvent) => {
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
        router.push("/onboarding");
      } else {
        setError(data.error || "Invalid token. Please try again.");
        setSubmitting(false);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const githubButtonDisabled = ownerType === "org" && orgName.trim() === "";

  // STEP 1: Introduction
  if (step === "intro") {
    return (
      <div className="min-h-screen bg-background text-text-primary px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-border bg-surface-alt p-8 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
            {/* Title */}
            <h1 className="text-2xl font-semibold mb-3">
              Connect your Github Data
            </h1>

            {/* Description */}
            <p className="text-text-secondary mb-6 leading-relaxed">
              We’ll guide you through creating a read-only token that allows
              DevImpact to make insights from your GitHub activity. The process
              takes about two minutes.
            </p>

            {/* Selector */}
            <label className="mb-2 block text-md font-medium text-text-primary">
              Where do you want to show impact from?
            </label>

            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {/* Organization Option */}
              <div
                onClick={() => setOwnerType("org")}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition
                ${
                  ownerType === "org"
                    ? "border-[var(--color-accent)] bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)]"
                    : "border-border bg-surface hover:bg-background/60"
                }`}
              >
                <div>
                  <div className="font-medium text-text-primary">
                    Organization
                  </div>
                  <div className="text-sm text-text-secondary">
                    Company / team repos (e.g.{" "}
                    <span className="font-mono">acme</span>/
                    <span className="font-mono">project</span>)
                  </div>
                </div>
              </div>

              {/* Personal Option */}
              <div
                onClick={() => setOwnerType("personal")}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition
                ${
                  ownerType === "personal"
                    ? "border-[var(--color-accent)] bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)]"
                    : "border-border bg-surface hover:bg-background/60"
                }`}
              >
                <div>
                  <div className="font-medium text-text-primary">Personal</div>
                  <div className="text-sm text-text-secondary">
                    Your own repos (e.g. <span className="font-mono">you</span>/
                    <span className="font-mono">project</span>)
                  </div>
                </div>
              </div>
            </div>

            {/* Conditional org field */}
            {ownerType === "org" && (
              <div className="mb-6">
                <label
                  htmlFor="orgSlug"
                  className="mb-1 block text-md text-text-primary"
                >
                  Organization slug
                </label>
                <input
                  id="orgSlug"
                  autoFocus
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g., acme"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
                <p className="mt-1 text-xs text-text-tertiary">
                  This is the part before the slash in{" "}
                  <span className="font-mono">org/repo</span>.
                </p>
                {error && (
                  <p className="mt-2 text-xs text-[var(--color-danger,#ef4444)]">
                    {error}
                  </p>
                )}
              </div>
            )}

            {ownerType !== null && (
              <div className="bg-background border border-blue-200 rounded-lg p-5 mb-6">
                <h3 className="font-semibold text-text-primary mb-3">
                  When GitHub opens, you'll need to:
                </h3>
                <ol className="space-y-3 text-sm text-text-secondary">
                  <li className="flex items-start">
                    <span className="font-semibold mr-2 min-w-[20px]">1.</span>
                    <div>
                      {ownerType === "org" ? (
                        <>
                          <strong>
                            {orgName ? "Confirm" : "Select"} your organization
                          </strong>{" "}
                          in the "Resource owner" dropdown
                        </>
                      ) : (
                        <>
                          Keep "Resource owner" as your personal account
                          (already selected)
                        </>
                      )}
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2 min-w-[20px]">2.</span>
                    <div>Choose which repositories to track</div>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2 min-w-[20px]">3.</span>
                    <div>Click "Generate token" and copy it</div>
                  </li>
                </ol>
              </div>
            )}

            {ownerType !== null && (
              <div>
                <button
                  onClick={handleOpenGitHub}
                  disabled={githubButtonDisabled}
                  className={[
                    "w-full rounded-xl px-4 py-3 font-semibold transition",
                    githubButtonDisabled
                      ? // disabled styles
                        "text-text-secondary bg-surface cursor-not-allowed pointer-events-none"
                      : // enabled styles
                        "bg-accent text-white hover:bg-[var(--color-accent-hover)]",
                  ].join(" ")}
                >
                  {orgName
                    ? `Open GitHub (Pre-filled: ${orgName})`
                    : "Open GitHub"}{" "}
                  →
                </button>

                <p className="mt-4 text-xs text-gray-500 text-center">
                  Opens in a new tab • All permissions pre-filled
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === "paste-token") {
    return (
      <div className="min-h-screen bg-background text-text-primary px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-border bg-surface-alt p-8 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
            {/* Title */}
            <h2 className="mb-2 text-2xl font-semibold">Paste your token</h2>
            <p className="mb-6 text-text-secondary">
              Copy the token from GitHub and paste it below.
            </p>

            {/* Helper panel */}
            <div className="mb-6 rounded-xl border border-border bg-surface p-4">
              <p className="mb-2 text-sm">
                <span className="font-semibold">Still in GitHub?</span> After
                clicking
                <span className="font-semibold"> “Generate token”</span>:
              </p>
              <ol className="list-decimal space-y-1 pl-6 text-sm text-text-secondary">
                <li>Click the copy icon next to your new token</li>
                <li>Return to this tab</li>
                <li>Paste it in the box below</li>
              </ol>
            </div>

            {/* Token form */}
            <form onSubmit={handleSubmitToken} className="space-y-4">
              <div>
                <label
                  htmlFor="token"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  GitHub Personal Access Token
                </label>
                <input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value.trim())}
                  placeholder="github_pat_11A..."
                  autoFocus
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
                <p className="mt-2 text-xs text-text-tertiary">
                  🔒 We encrypt and securely store your token.
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleOpenGitHub}
                  className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-text-primary hover:bg-background/60"
                >
                  Re-open GitHub
                </button>

                {(() => {
                  const disabled = submitting || !token;
                  return (
                    <button
                      type="submit"
                      disabled={disabled}
                      className={[
                        "flex-1 rounded-xl px-4 py-3 font-semibold transition",
                        disabled
                          ? "bg-accent/60 text-text-secondary opacity-60 cursor-not-allowed pointer-events-none"
                          : "bg-accent text-text-primary hover:bg-[var(--color-accent-hover)]",
                      ].join(" ")}
                    >
                      {submitting ? "Verifying…" : "Connect Token"}
                    </button>
                  );
                })()}
              </div>
            </form>

            {/* Footer help */}
            <div className="mt-6 border-t border-border pt-6">
              <p className="mb-2 text-sm text-text-secondary">
                Having trouble?
              </p>
              <div className="flex gap-4 text-sm">
                <button
                  onClick={() => setStep("intro")}
                  className="text-accent hover:underline"
                >
                  ← Start over
                </button>
                <a
                  href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  View GitHub’s guide →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
