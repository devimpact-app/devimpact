import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center relative overflow-hidden px-4">
      {/* soft accent glow */}
      {/* <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/3 h-152 w-152 -translate-x-1/2 rounded-full blur-3xl opacity-25"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-accent), transparent 70%)",
          }}
        />
      </div> */}

      {/* card */}
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface-alt backdrop-blur p-8 shadow-xl">
        {/* brand / heading */}
        <div className="text-center">
          <a
            href="/"
            className="inline-block text-base font-semibold text-text-primary"
          >
            DevImpact
          </a>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Welcome!</h1>
          <p className="mt-2 text-text-secondary">
            Sign in to your private impact workspace
          </p>
        </div>

        {/* sign-in */}
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/onboarding" });
          }}
        >
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-border bg-background/70 px-4 py-3 font-medium text-text-primary transition
                       hover:bg-background hover:outline-none hover:ring-2 hover:ring-offset-0 hover:ring-accent cursor-pointer"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            Continue with GitHub
          </button>
        </form>

        {/* secondary / reassurance */}
        <div className="mt-6 text-center text-sm text-text-secondary">
          Private by default. You control integrations and sharing.
        </div>

        {/* tiny links */}
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
            href="mailto:hello@devimpact.app"
            className="hover:text-text-primary"
          >
            Contact
          </a>
        </div>
      </div>
    </div>
  );
}
