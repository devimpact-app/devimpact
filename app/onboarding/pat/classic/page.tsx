"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ClassicPatSetup() {
  const router = useRouter();

  const [step, setStep] = useState<"intro" | "paste-token">("intro");
  const [ownerType, setOwnerType] = useState<"org" | "personal" | null>(null);
  const [orgName, setOrgName] = useState("");
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // --- Classic PAT creation URL (pre-fills scopes & description) ---
  // Classic PATs use /settings/tokens/new and accept ?scopes=, &description=
  // For reading private repos you unfortunately need `repo` (broad).
  // We also include read:org and user:email to read org membership + email.
  const classicUrl = new URL("https://github.com/settings/tokens/new");
  classicUrl.searchParams.set("description", "DevImpact (read-only usage)");
  classicUrl.searchParams.set("scopes", "repo,read:org,user:email");

  const handleOpenGitHub = () => {
    // 1) Open the Classic PAT creation page
    window.open(classicUrl.toString(), "_blank");

    // 2) If org provided, optionally open the SSO authorization page
    // (many orgs require you to authorize your classic token for org access)
    if (ownerType === "org" && orgName.trim()) {
      const ssoUrl = `https://github.com/orgs/${orgName.trim()}/settings/personal-access-tokens`;
      window.open(ssoUrl, "_blank");
    }

    // Move to paste step
    setStep("paste-token");
  };

  const handleSubmitToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      // same endpoint you already use; you may want to tag this as classic on server
      const res = await fetch("/api/github/pat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          orgName: orgName.trim() || null,
          type: "classic",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push("/onboarding");
      } else {
        setError(data.error || "Invalid token. Please try again.");
        setSubmitting(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const githubButtonDisabled = ownerType === "org" && orgName.trim() === "";

  // ===== STEP: INTRO =====
  if (step === "intro") {
    return (
      <div className="min-h-screen bg-background text-text-primary px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-border bg-surface-alt p-8 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
            <h1 className="mb-3 text-2xl font-semibold">
              Connect your GitHub Data (Classic PAT)
            </h1>
            <p className="mb-6 leading-relaxed text-text-secondary">
              Create a <span className="font-medium">Classic</span> Personal
              Access Token to let DevImpact read your GitHub activity. This
              works immediately and does{" "}
              <span className="font-medium">not</span> require org admin
              approval, but uses broader scopes than a Fine-Grained token.
            </p>

            <label className="mb-2 block text-md font-medium text-text-primary">
              Where do you want to show impact from?
            </label>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {/* Organization */}
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

              {/* Personal */}
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

            {/* Org field only if org selected */}
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
              <div className="mb-6 rounded-xl border border-border bg-surface p-5">
                <h3 className="mb-3 font-semibold text-text-primary">
                  When GitHub opens, you'll need to:
                </h3>
                <ol className="space-y-3 text-sm text-text-secondary">
                  <li className="flex items-start">
                    <span className="mr-2 min-w-[20px] font-semibold">1.</span>
                    <div>
                      The page will be pre-filled with required scopes:{" "}
                      <span className="font-mono">repo</span>,{" "}
                      <span className="font-mono">read:org</span>,{" "}
                      <span className="font-mono">user:email</span>.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 min-w-[20px] font-semibold">2.</span>
                    <div>Choose which repositories to track (optional).</div>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 min-w-[20px] font-semibold">3.</span>
                    <div>Click “Generate token” and copy it.</div>
                  </li>
                  {ownerType === "org" && (
                    <li className="flex items-start">
                      <span className="mr-2 min-w-[20px] font-semibold">
                        4.
                      </span>
                      <div>
                        If your org uses SSO, authorize the token for{" "}
                        <span className="font-mono">
                          {orgName || "your org"}
                        </span>{" "}
                        (we’ll open the SSO page in a new tab).
                      </div>
                    </li>
                  )}
                </ol>
              </div>
            )}

            {/* CTA */}
            {ownerType !== null && (
              <div>
                <button
                  onClick={handleOpenGitHub}
                  disabled={githubButtonDisabled}
                  className={[
                    "w-full rounded-xl px-4 py-3 font-semibold transition",
                    githubButtonDisabled
                      ? "bg-surface text-text-secondary cursor-not-allowed pointer-events-none"
                      : "bg-accent text-white hover:bg-[var(--color-accent-hover)]",
                  ].join(" ")}
                >
                  {ownerType === "org" && orgName.trim()
                    ? `Open GitHub (Classic PAT • Org: ${orgName.trim()})`
                    : "Open GitHub (Classic PAT)"}{" "}
                  →
                </button>
                <p className="mt-4 text-center text-xs text-text-tertiary">
                  Opens in a new tab • Broader access than Fine-Grained PATs
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP: PASTE TOKEN =====
  if (step === "paste-token") {
    return (
      <div className="min-h-screen bg-background text-text-primary px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-border bg-surface-alt p-8 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
            <h2 className="mb-2 text-2xl font-semibold">Paste your token</h2>
            <p className="mb-6 text-text-secondary">
              Copy the token from GitHub and paste it below.
            </p>

            <div className="mb-6 rounded-xl border border-border bg-surface p-4">
              <p className="mb-2 text-sm">
                <span className="font-semibold">Still in GitHub?</span> After
                clicking <span className="font-semibold">“Generate token”</span>
                :
              </p>
              <ol className="list-decimal space-y-1 pl-6 text-sm text-text-secondary">
                <li>Click the copy icon next to your new token</li>
                <li>Return to this tab</li>
                <li>Paste it in the box below</li>
              </ol>
            </div>

            <form onSubmit={handleSubmitToken} className="space-y-4">
              <div>
                <label
                  htmlFor="token"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  GitHub Personal Access Token (Classic)
                </label>
                <input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value.trim())}
                  placeholder="ghp_ABC…"
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
                  href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token#creating-a-classic-personal-access-token"
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

  return null;
}
