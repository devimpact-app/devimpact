"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WaitingForApproval({
  type,
}: {
  type: "github_app" | "fine_grained_pat";
}) {
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleCheckStatus = async () => {
    setChecking(true);
    setMessage("");

    try {
      const res = await fetch("/api/github/pat/check", {
        method: "GET",
      });

      const data = await res.json();

      if (data.success) {
        setMessage("✅ Approved! Redirecting...");
        // Refresh the page to get new state
        router.refresh();
      } else {
        setMessage("⏳ Still waiting for approval. Check back later.");
      }
    } catch (error) {
      setMessage("❌ Error checking status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const isGitHubApp = type === "github_app";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          {/* Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <span className="text-3xl">⏳</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Waiting for Organization Approval
            </h1>
            <p className="text-gray-600">
              Your GitHub organization admin needs to approve{" "}
              {isGitHubApp ? "the app installation" : "your PAT access"}.
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">
              What to do next:
            </h2>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="font-semibold mr-2">1.</span>
                Contact your GitHub organization admin
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">2.</span>
                Ask them to approve DevImpact access in{" "}
                {isGitHubApp
                  ? "GitHub Settings → Applications"
                  : "GitHub Settings → Personal Access Tokens"}
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">3.</span>
                Come back here and click "Check Status"
              </li>
            </ol>
          </div>

          {/* Status message */}
          {message && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
              {message}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
            >
              {checking ? "Checking..." : "Check Approval Status"}
            </button>

            <a
              href="/dashboard"
              className="block w-full text-center text-gray-600 hover:text-gray-900 py-2"
            >
              I'll finish this later →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
