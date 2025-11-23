export function SoftStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <span className="flex flex-col leading-tight">
      <span className="text-[13px] font-semibold text-slate-200">{value}</span>
      <span className="text-[11px] text-slate-500">{label}</span>
    </span>
  );
}
