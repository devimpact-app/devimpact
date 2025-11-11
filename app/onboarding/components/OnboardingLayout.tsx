export function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-text-primary px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-border bg-surface-alt p-8 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
          {children}
        </div>
      </div>
    </div>
  );
}
