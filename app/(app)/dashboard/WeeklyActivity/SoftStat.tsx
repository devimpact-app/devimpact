export function SoftStat({
  label,
  value,
  isFirst = false,
}: {
  label: string;
  value: number | string;
  isFirst?: boolean;
}) {
  return (
    <span className="flex items-start gap-2">
      {/* Value + label */}
      <span className="flex min-w-[4.5rem] items-center flex-col gap-0.5 leading-tight">
        <span className="text-[14px] font-bold text-slate-300 tabular-nums">
          {value}
        </span>
        <span className="text-[11px] text-slate-500">{label}</span>
      </span>
    </span>
  );
}
