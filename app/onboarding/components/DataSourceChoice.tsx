"use client";

import { useState } from "react";
import PatSetup from "./PatSetup";

export default function DataSourceChoice({
  userId,
  githubUsername,
}: {
  userId: string;
  githubUsername: string;
}) {
  const [showPatSetup, setShowPatSetup] = useState(false);

  if (showPatSetup) {
    return <PatSetup onBack={() => setShowPatSetup(false)} />;
  }

  const state = Buffer.from(
    JSON.stringify({
      userId,
      githubUsername,
    }),
  ).toString("base64");

  const appInstallUrl = `${process.env.NEXT_PUBLIC_GITHUB_APP_INSTALLATION_URL}?state=${state}`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Connect Your GitHub Data
          </h1>
          <p className="text-gray-600">
            Choose how you'd like to connect your work activity
          </p>
        </div>

        {/* Primary Option: GitHub App */}
        <div className="bg-white rounded-lg border-2 border-blue-500 p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                ✨ Install GitHub App
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Recommended for most users
              </p>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
              BEST
            </span>
          </div>

          <ul className="space-y-2 mb-6 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              Most secure (fine-grained permissions)
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              Select specific repositories
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              Easy to manage and revoke
            </li>
          </ul>

          <a
            href={appInstallUrl}
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition"
          >
            Install GitHub App
          </a>

          <p className="text-xs text-gray-500 mt-3">
            ⚠️ May require org admin approval at some companies
          </p>
        </div>

        {/* Fallback Option: PAT */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            🔑 Personal Access Token
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Use if you can't install the GitHub App
          </p>

          <ul className="space-y-2 mb-6 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-gray-400 mr-2">•</span>
              Works immediately, no approval needed
            </li>
            <li className="flex items-start">
              <span className="text-gray-400 mr-2">•</span>
              Manual setup (2-3 minutes)
            </li>
          </ul>

          <button
            onClick={() => setShowPatSetup(true)}
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-4 rounded-lg text-center transition"
          >
            Use Personal Access Token
          </button>
        </div>

        {/* Help text */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Not sure which to choose? Start with GitHub App.
            <br />
            Need help?{" "}
            <a
              href="mailto:hello@devimpact.app"
              className="text-blue-600 hover:underline"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
