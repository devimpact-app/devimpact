'use client';

import { Github } from 'lucide-react';
import { loginWithGithub } from './actions';

export default function LoginClient({
  betaCode,
  hasValidCode,
}: {
  betaCode?: string;
  hasValidCode: boolean;
}) {
  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center relative overflow-hidden px-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface-alt backdrop-blur p-8 shadow-xl">
        <div className="text-center">
          <a
            href="/"
            className="inline-block text-base font-semibold text-text-primary"
          >
            DevImpact
          </a>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            {hasValidCode ? 'Welcome!' : 'Beta Access'}
          </h1>
          <p className="mt-2 text-text-secondary">
            {hasValidCode
              ? 'Sign in to your private impact workspace'
              : 'Enter your beta access code to continue'}
          </p>
        </div>

        {!hasValidCode && (
          <form className="mt-8 space-y-4" action="/login" method="GET">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-text-secondary tracking-wide">
                Access Code
              </label>

              <div
                className="
          flex items-center gap-2 
          rounded-xl bg-[#11151F] border border-white/10 
          px-3 py-2
          focus-within:ring-2 focus-within:ring-[#7EA6F8] 
          transition
        "
              >
                <svg
                  className="h-4 w-4 text-white/40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 11c0-2.21-1.79-4-4-4S4 8.79 4 11v2H3v8h10v-8h-1v-2z" />
                  <circle cx="8" cy="7" r="4" />
                </svg>

                <input
                  type="text"
                  name="code"
                  required
                  placeholder="Enter your beta access code"
                  className="
            flex-1 bg-transparent outline-none 
            text-sm text-white placeholder:text-white/40
          "
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="
        w-full rounded-xl 
        bg-[#1C2333] border border-white/10 
        py-2.5 text-sm font-medium text-[#7EA6F8]
        hover:bg-[#242C3C] transition
        hover:ring-2 hover:ring-[#7EA6F8]/40
      "
            >
              Continue
            </button>
          </form>
        )}

        {hasValidCode && (
          <form className="mt-8" action={loginWithGithub}>
            <input type="hidden" name="betaCode" value={betaCode ?? ''} />
            <button
              type="submit"
              className="
                w-full inline-flex items-center justify-center gap-3 rounded-xl border border-border 
                bg-background/70 px-4 py-3 font-medium text-text-primary transition
                hover:bg-background hover:ring-2 hover:ring-accent cursor-pointer
              "
            >
              <Github className="h-5 w-5" />
              Continue with GitHub
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-text-secondary">
          Private by default. You control integrations and sharing.
        </div>

        <div className="mt-3 flex justify-center gap-4 text-xs text-text-secondary">
          <a href="/privacy" className="hover:text-text-primary">
            Privacy
          </a>
          <span>·</span>
          <a href="/terms" className="hover:text-text-primary">
            Terms
          </a>
          <span>·</span>
          <a
            href="mailto:ian@devimpact.app"
            className="hover:text-text-primary"
          >
            Contact
          </a>
        </div>
      </div>
    </div>
  );
}
