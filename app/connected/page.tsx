"use client";

import { useSearchParams } from "next/navigation";

export default function ConnectingPage() {
  const searchParams = useSearchParams();
  const installationId = searchParams.get("installation_id");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl font-semibold mb-4">
          🎉 Thanks for connecting your GitHub organization!
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          DevImpact is now authorized to read metadata about the repositories
          you selected.
        </p>

        {installationId && (
          <p className="text-sm text-gray-500 mb-2">
            Installation ID: {installationId}
          </p>
        )}

        <p className="text-gray-500 text-sm">
          You can close this tab. We've notified the developers who requested
          access.
        </p>
      </div>
    </main>
  );
}
