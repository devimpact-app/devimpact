export function StatusPill({
  kind,
  label,
}: {
  kind: 'neutral' | 'good' | 'warn' | 'bad';
  label: string;
}) {
  const cls =
    kind === 'good'
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
      : kind === 'warn'
        ? 'border-amber-400/20 bg-amber-400/10 text-amber-200'
        : kind === 'bad'
          ? 'border-rose-400/20 bg-rose-400/10 text-rose-200'
          : 'border-white/10 bg-white/[0.03] text-white/70';

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium',
        cls,
      ].join(' ')}
    >
      {label}
    </span>
  );
}
