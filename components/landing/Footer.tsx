export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface/60 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="md:flex md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <p className="text-sm text-text-secondary">
              Built by{' '}
              <span className="text-text-primary font-medium">Ian Richard</span>
            </p>
          </div>

          <nav className="mt-6 flex justify-center gap-6 text-sm text-text-secondary md:mt-0">
            <a
              href="https://github.com/devimpact-app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary transition"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/ian-richard"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary transition"
            >
              LinkedIn
            </a>
            <a
              href="mailto:ian@devimpact.app"
              className="hover:text-text-primary transition"
            >
              Contact
            </a>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-text-secondary/70">
            <a href="/privacy" className="hover:text-text-secondary transition">
              Privacy
            </a>
            {' · '}
            <a href="/terms" className="hover:text-text-secondary transition">
              Terms
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
