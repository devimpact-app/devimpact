"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WaitingForApproval({ orgSlug }: { orgSlug?: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [message, setMessage] = useState("");

  async function onCheck() {
    try {
      setChecking(true);
      await handleCheckStatus();
      setLastChecked(new Date());
    } finally {
      setChecking(false);
    }
  }

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

  return (
    <div className="min-h-screen bg-background text-text-primary px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-border bg-surface-alt p-8 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
          {/* Header */}
          <h1 className="text-2xl font-semibold">Waiting for org approval</h1>
          <p className="mt-2 text-text-secondary">
            We’re waiting for an organization admin to approve your{" "}
            <span className="font-medium">
              Fine-Grained Personal Access Token
            </span>
            {orgSlug ? (
              <>
                {" "}
                for <span className="font-mono">{orgSlug}</span>.
              </>
            ) : (
              "."
            )}{" "}
            You’ll get access to your organization repos once it’s approved.
          </p>

          {/* Status panel */}
          <div className="mt-6 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              {/* status dot */}
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-warning ring-4 ring-warning/10" />
              <div>
                <div className="font-medium">Approval pending</div>
                <div className="text-sm text-text-secondary">
                  {lastChecked
                    ? `Last checked ${lastChecked.toLocaleTimeString()}`
                    : "We’ll keep your setup ready to go."}
                </div>
                <div className="font-medium">{message}</div>
              </div>
            </div>

            {/* Helpful steps */}
            <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm text-text-secondary">
              <li>
                Ask an org admin to approve your token request in GitHub’s{" "}
                <span className="font-medium">
                  “Organization access requests”
                </span>
                .
              </li>
              <li>Once approved, return here and click “Check status”.</li>
            </ol>

            {/* Actions */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={onCheck}
                className={[
                  "inline-flex items-center justify-center rounded-xl px-4 py-3 font-semibold transition",
                  checking
                    ? "bg-accent/60 text-white opacity-60 cursor-not-allowed pointer-events-none"
                    : "bg-accent text-white hover:bg-[var(--color-accent-hover)]",
                ].join(" ")}
              >
                {checking ? (
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Checking…
                  </span>
                ) : (
                  "Check status"
                )}
              </button>

              <a
                href="https://github.com/settings/personal-access-tokens/requests"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary hover:bg-background/60"
              >
                Open approval page ↗
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="mt-8 border-t border-border pt-6" />

          {/* Alternative path */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-2 font-medium">Waiting for org approval?</div>
            <p className="text-sm text-text-secondary">
              While you wait, you can use a{" "}
              <span className="font-medium">Classic PAT</span> for immediate
              access:
            </p>

            <button
              onClick={() => {
                router.push("/onboarding/pat/classic");
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary hover:bg-background/60"
            >
              <span>Use Classic PAT instead</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
