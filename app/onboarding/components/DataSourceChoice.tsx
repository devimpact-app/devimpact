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

  if (showPatSetup) return <PatSetup onBack={() => setShowPatSetup(false)} />;

  const state = Buffer.from(
    JSON.stringify({ userId, githubUsername }),
  ).toString("base64");
  const appInstallUrl = `${process.env.NEXT_PUBLIC_GITHUB_APP_INSTALLATION_URL}?state=${state}`;

  return (
    <div className="min-h-screen bg-background text-text-primary px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight leading-tight">
            Connect Your GitHub Data
          </h1>
          <p className="mt-2 text-text-secondary">
            Choose how you’d like DevImpact to read your work activity
            (read-only).
          </p>
        </header>

        <section className="mt-10 rounded-xl border border-border bg-surface-alt p-5 hover:translate-y-[-1px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-tight">
                🔑 Personal Access Token
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Read-only, repo-scoped.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
              Recommended
            </span>
          </div>

          {/* Feature grid */}
          <ul className="mb-4 grid gap-2 sm:grid-cols-3 text-sm">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-text-secondary">
                Usually no admin approval needed
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-text-secondary">Choose repos</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-text-secondary">Easy revoke/rotate</span>
            </li>
          </ul>

          {/* Best for chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-tertiary">Best for:</span>
            <span className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-xs text-text-secondary">
              Individual devs
            </span>
            <span className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-xs text-text-secondary">
              No org admin
            </span>
            <span className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-xs text-text-secondary">
              Quick setup
            </span>
          </div>

          {/* CTA */}
          <button
            onClick={() => setShowPatSetup(true)}
            className="w-full rounded-xl bg-accent mt-5 px-4 py-2.5 text-center font-semibold text-white hover:bg-accent-hover"
          >
            Setup PAT
          </button>
        </section>

        <section className="mt-5 rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-tight">
                ✨ Install GitHub App
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Fine-grained app permissions. Usually requires org-admin
                approval.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-text-secondary">
              Alternative
            </span>
          </div>

          <ul className="mb-4 grid gap-2 sm:grid-cols-3 text-sm">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-text-secondary/60" />
              <span className="text-text-secondary">Granular perms</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-text-secondary/60" />
              <span className="text-text-secondary">Select repos</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-text-secondary/60" />
              <span className="text-text-secondary">Managed in GitHub</span>
            </li>
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-tertiary">Best for:</span>
            <span className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-xs text-text-secondary">
              Org admins
            </span>
            <span className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-xs text-text-secondary">
              Team-wide use
            </span>
            <span className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-xs text-text-secondary">
              Central control
            </span>
          </div>

          <a
            href={appInstallUrl}
            className="block w-full mt-5 rounded-xl border border-border bg-background px-4 py-2.5 text-center font-medium text-text-primary hover:bg-background/80"
          >
            Install GitHub App
          </a>
        </section>

        {/* Help */}
        <div className="mt-8 text-center text-sm text-text-secondary">
          Not sure which to choose? Start with the{" "}
          <strong>Personal Access Token</strong>.
          <br />
          Need help?{" "}
          <a
            href="mailto:hello@devimpact.app"
            className="text-accent hover:underline"
          >
            Contact us
          </a>
        </div>
      </div>
    </div>
  );
}
