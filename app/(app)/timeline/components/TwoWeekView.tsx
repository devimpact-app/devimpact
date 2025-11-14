export function TwoWeekSkeleton({
  weekdayLabels,
}: {
  weekdayLabels: string[];
}) {
  const rows = [0, 1];

  return (
    <section className="rounded-2xl border border-border bg-surface-alt px-4 py-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        Activity last 2 weeks
      </h3>
      <div className="space-y-1.5">
        {rows.map((rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-7 gap-1.5">
            {weekdayLabels.map((label, colIdx) => (
              <div
                key={`${rowIdx}-${label}`}
                className="flex flex-col items-center gap-1"
              >
                <div className="h-20 w-full rounded-md border border-slate-700 bg-slate-900" />
                {rowIdx === rows.length - 1 && (
                  <span className="text-[10px] text-text-secondary">
                    {label}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
