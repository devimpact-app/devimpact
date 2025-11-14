export function FourWeekSkeleton({ start, end }: { start: Date; end: Date }) {
  // Very simple week labels: we’ll just generate up to 4 week starts from `start`
  const weeks: { label: string }[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 4; i++) {
    if (cursor > end) break;

    const label = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(cursor);

    weeks.push({ label });

    cursor.setDate(cursor.getDate() + 7);
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-alt px-4 py-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        Activity last 4 weeks
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {weeks.map((w, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <div className="h-20 w-full rounded-lg border border-slate-700 bg-slate-900" />
            <span className="text-[10px] text-text-secondary">
              Week of {w.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
