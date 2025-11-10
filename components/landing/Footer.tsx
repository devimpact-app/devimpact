export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface/60 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-10 md:flex md:items-center md:justify-between">
        <div className="text-center md:text-left">
          <a href="/" className="text-lg font-semibold text-text-primary">
            DevImpact
          </a>
          <p className="mt-1 text-sm text-text-secondary">
            Your work. Your data. Your story.
          </p>
        </div>

        {/* Center — nav links */}
        <nav className="mt-6 flex justify-center gap-6 text-sm text-text-secondary md:mt-0">
          <a href="/privacy" className="hover:text-text-primary">
            Privacy
          </a>
          <a href="/terms" className="hover:text-text-primary">
            Terms
          </a>
          <a
            href="mailto:hello@devimpact.app"
            className="hover:text-text-primary"
          >
            Contact
          </a>
        </nav>

        {/* Right side — copyright */}
        <div className="mt-6 text-center text-xs text-text-secondary md:mt-0 md:text-right">
          {new Date().getFullYear()} DevImpact.
        </div>
      </div>
    </footer>
  );
}
