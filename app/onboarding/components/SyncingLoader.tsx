"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const POLL_MS = 10_000;

export default function SyncingPage() {
  const router = useRouter();
  const params = useSearchParams();
  // If you scope sync by approvalId/source, thread it through the URL:
  const approvalId = params.get("approvalId") ?? undefined;

  const [onboardingState, setOnboardingState] = useState<string>("syncing");
  const [since, setSince] = useState<number>(0); // ms elapsed
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Track elapsed time
  useEffect(() => {
    const t0 = Date.now();
    const t = setInterval(() => setSince(Date.now() - t0), 1000);
    return () => clearInterval(t);
  }, []);

  // Polling loop
  useEffect(() => {
    mountedRef.current = true;

    async function hit() {
      try {
        const res = await fetch("/api/github/sync");
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const { onboardingState } = await res.json();
        setOnboardingState(onboardingState);
        if (!mountedRef.current) return;
        if (onboardingState === "complete") {
          // tiny delay to let users see 100% tick
          setTimeout(() => router.push("/dashboard"), 400);
          return; // stop polling
        }
        timerRef.current = setTimeout(hit, POLL_MS);
      } catch (e: any) {
        if (!mountedRef.current) return;
        // keep polling even on transient errors
        timerRef.current = setTimeout(hit, POLL_MS);
      }
    }

    // kick off immediately
    hit();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [approvalId, router]);

  const seconds = Math.floor(since / 1000);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
              <span className="text-2xl">🔄</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Syncing your repositories…
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              You’re connected. We’re importing recent PRs, reviews, and
              activity.
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
              <span>
                Status:{" "}
                {onboardingState === "complete" ? "Complete" : "Syncing"}
              </span>
            </div>
          </div>

          {/* Hints */}
          <div className="mt-4 text-xs text-gray-500">
            Elapsed time: {seconds}s · This can take a minute or two for larger
            orgs.
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full rounded-lg border px-4 py-2.5 text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              I’ll check the dashboard
            </button>
            <button
              onClick={() => location.reload()}
              className="w-full rounded-lg border px-4 py-2.5 text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              Refresh now
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          You can close this tab—sync will continue in the background.
        </p>
      </div>
    </div>
  );
}
