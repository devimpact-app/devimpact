"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PatSetup({ onBack }: { onBack: () => void }) {
  const router = useRouter();

  const [step, setStep] = useState<
    "intro" | "org-check" | "ready" | "paste-token"
  >("intro");
  const [hasOrg, setHasOrg] = useState<boolean | null>(null);
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

  // STEP 1: Introduction
  if (step === "intro") {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <button
              onClick={onBack}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              ← Back
            </button>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Create Personal Access Token
            </h1>

            <p className="text-gray-600 mb-6">
              We'll guide you through creating a token that tracks your work
              contributions. This takes about 2 minutes.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                What you'll need:
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Access to your GitHub account</li>
                <li>✓ Name of your work organization (if applicable)</li>
                <li>✓ 2-3 minutes</li>
              </ul>
            </div>

            <button
              onClick={() => setStep("org-check")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition"
            >
              Get Started →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Check if user has org
  if (step === "org-check") {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <button
              onClick={() => setStep("intro")}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              ← Back
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Quick Question
            </h2>

            <p className="text-gray-600 mb-6">
              Do you work on repositories that belong to a GitHub organization
              (like a company account)?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setHasOrg(true);
                  setStep("ready");
                }}
                className="w-full text-left p-4 border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition"
              >
                <div className="font-semibold text-gray-900 mb-1">
                  ✓ Yes, I work in an organization
                </div>
                <div className="text-sm text-gray-600">
                  Repos like: organization-name/repo-name
                </div>
              </button>

              <button
                onClick={() => {
                  setHasOrg(false);
                  setStep("ready");
                }}
                className="w-full text-left p-4 border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition"
              >
                <div className="font-semibold text-gray-900 mb-1">
                  ✓ No, just my personal repos
                </div>
                <div className="text-sm text-gray-600">
                  Repos like: my-username/repo-name
                </div>
              </button>

              <button
                onClick={() => {
                  setHasOrg(null);
                  setStep("ready");
                }}
                className="w-full text-left p-4 border-2 border-gray-200 hover:border-gray-300 rounded-lg transition"
              >
                <div className="text-sm text-gray-600">
                  Not sure / I'll figure it out later
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: Ready to go
  if (step === "ready") {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <button
              onClick={() => setStep("org-check")}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              ← Back
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Almost Ready!
            </h2>

            {/* Show different instructions based on org status */}
            {hasOrg === true && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What's your organization name on GitHub?
                </label>
                <input
                  type="text"
                  placeholder="e.g., acme-corp"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value.trim())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Find this at github.com - look for "org-name/repo-name" in
                  your repos
                </p>
              </div>
            )}

            {/* Instructions for what to do in GitHub */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                When GitHub opens, you'll need to:
              </h3>
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="font-semibold mr-2 min-w-[20px]">1.</span>
                  <div>
                    {hasOrg === true ? (
                      <>
                        <strong>
                          {orgName ? "Confirm" : "Select"} your organization
                        </strong>{" "}
                        in the "Resource owner" dropdown
                      </>
                    ) : hasOrg === false ? (
                      <>
                        Keep "Resource owner" as your personal account (already
                        selected)
                      </>
                    ) : (
                      <>
                        <strong>Select "Resource owner"</strong> - choose your
                        work organization if you have one, or keep it as your
                        personal account
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

            {/* Warning if no org name provided */}
            {hasOrg === true && !orgName && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800">
                  ⚠️ We recommend entering your org name above to pre-fill the
                  form. Otherwise you'll need to select it manually in GitHub.
                </p>
              </div>
            )}

            {/* Open GitHub button */}
            <button
              onClick={handleOpenGitHub}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition"
            >
              {orgName ? `Open GitHub (Pre-filled: ${orgName})` : "Open GitHub"}{" "}
              →
            </button>

            <p className="text-xs text-gray-500 text-center">
              Opens in a new tab • All permissions pre-filled
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "paste-token") {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Paste Your Token
            </h2>
            <p className="text-gray-600 mb-6">
              Copy the token from GitHub and paste it below
            </p>

            {/* Reminder of what to do */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Still in GitHub?</strong> After clicking "Generate
                token":
              </p>
              <ol className="text-sm text-gray-700 space-y-1 ml-4">
                <li>1. Click the copy icon next to your new token</li>
                <li>2. Come back to this tab</li>
                <li>3. Paste it in the box below</li>
              </ol>
            </div>

            {/* Token input form */}
            <form onSubmit={handleSubmitToken} className="space-y-4">
              <div>
                <label
                  htmlFor="token"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  GitHub Personal Access Token
                </label>
                <input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value.trim())}
                  placeholder="github_pat_11A..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  🔒 We encrypt and securely store your token
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleOpenGitHub}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg"
                >
                  Re-open GitHub
                </button>
                <button
                  type="submit"
                  disabled={submitting || !token}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
                >
                  {submitting ? "Verifying..." : "Connect Token"}
                </button>
              </div>
            </form>

            {/* Help links */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Having trouble?</p>
              <div className="flex gap-4 text-sm">
                <button
                  onClick={() => setStep("ready")}
                  className="text-blue-600 hover:underline"
                >
                  ← Start over
                </button>
                <a
                  href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View GitHub's guide →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
