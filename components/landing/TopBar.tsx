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
          className="
    rounded-xl 
    border border-[#283047] 
    bg-transparent 
    px-4 py-2 
    text-sm font-medium text-[#E2E6FF]
    hover:bg-[#0E1220]
    hover:border-[#3B4A78]
    transition
  "
        >
          Log in
        </a>
      </nav>
    </header>
  );
}
