export function OneWeekStripSkeleton({
  weekdayLabels,
}: {
  weekdayLabels: string[];
}) {
  // TODO:
  // Show events/meetings as background blocks (translucent) with dots over them for events
  // 3 columns of dots - using index to decide on lane to use

  return (
    <section className="rounded-2xl border border-border bg-surface-alt px-4 py-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        Activity this week
      </h3>
      <div className="grid grid-cols-7 gap-1.5">
        {weekdayLabels.map((label) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div className="h-[260px] md:h-[300px] w-full rounded-md border border-slate-700 bg-slate-900" />
            <span className="text-[10px] text-text-secondary">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
