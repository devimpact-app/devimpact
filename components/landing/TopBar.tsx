export default function TopBar() {
  return (
    <header className="w-full flex items-center justify-between px-6 py-4">
      <a
        href="/"
        className="text-lg font-semibold text-text-primary tracking-tight"
      >
        DevImpact
      </a>

      <nav className="flex items-center gap-4">
        <a
          href="/login"
          className="rounded-xl bg-accent hover:bg-accent-hover text-white px-4 py-2 font-semibold transition-colors"
        >
          Log in
        </a>
      </nav>
    </header>
  );
}
