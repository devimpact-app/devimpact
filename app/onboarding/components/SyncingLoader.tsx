"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SyncStatus = "pending" | "syncing" | "ready" | "error";

type StatusPayload = {
  status: SyncStatus;
  progress?: number; // 0..100
  message?: string; // optional detail
};

const POLL_MS = 10_000;

export default function SyncingPage() {
  const router = useRouter();
  const params = useSearchParams();
  // If you scope sync by approvalId/source, thread it through the URL:
  const approvalId = params.get("approvalId") ?? undefined;

  const [payload, setPayload] = useState<StatusPayload>({
    status: "pending",
    progress: 0,
  });
  const [error, setError] = useState<string | null>(null);
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
        // const url = new URL("/api/sync/status", window.location.origin);
        // if (approvalId) url.searchParams.set("approvalId", approvalId);
        // const res = await fetch(url.toString(), { cache: "no-store" });
        // if (!res.ok) throw new Error(`Status ${res.status}`);
        // const data: StatusPayload = await res.json();
        // if (!mountedRef.current) return;
        // setPayload(data);
        // setError(null);
        // if (data.status === "ready") {
        //   // tiny delay to let users see 100% tick
        //   setTimeout(() => router.push("/dashboard"), 400);
        //   return; // stop polling
        // }
        // if (data.status === "error") {
        //   // stop polling on error; show retry button
        //   return;
        // }
        // // schedule next poll
        // timerRef.current = setTimeout(hit, POLL_MS);
      } catch (e: any) {
        if (!mountedRef.current) return;
        setError(e?.message ?? "Failed to check sync");
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

  const pct = Math.min(100, Math.max(0, payload.progress ?? 0));
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
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-3 bg-blue-600 transition-[width] duration-500"
                style={{ width: `${pct}%` }}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                role="progressbar"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
              <span>
                Status:{" "}
                {payload.status === "ready" ? "Complete" : payload.status}
              </span>
              <span>{pct}%</span>
            </div>
          </div>

          {/* Message / errors */}
          {payload.message && (
            <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              {payload.message}
            </div>
          )}
          {error && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

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
