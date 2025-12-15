export default function TopBar() {
  return (
    <header
      className="
        fixed inset-x-0 top-0 z-50
        bg-transparent
      "
    >
      <div
        className="
          backdrop-blur-md
          supports-[backdrop-filter]:bg-black/20
          border-b border-white/10
        "
      >
        <div className="flex items-center justify-between px-6 py-4">
          <a
            href="/"
            className="text-2xl font-semibold text-text-primary tracking-tight"
          >
            DevImpact
          </a>

          <nav className="flex items-center gap-4">
            <a
              href="/login"
              className="
                rounded-xl border border-[#283047]
                bg-transparent px-4 py-2
                text-sm font-medium text-[#E2E6FF]
                hover:bg-white/5 hover:border-[#3B4A78]
                transition
              "
            >
              Log in
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
