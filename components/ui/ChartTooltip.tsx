type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{
    value: number | string | null;
    name: string;
  }>;
  label?: string | number;
  unit?: string;
  formatValue?: (rawValue: any) => string;
};

export function ChartTooltip({
  active,
  payload,
  label,
  unit,
  formatValue,
}: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0].value;

  return (
    <div
      className="
      rounded-lg 
      bg-slate-900/90 
      border border-slate-700 
      px-3 py-2 
      shadow-lg shadow-black/40
    "
    >
      <div className="text-[10px] text-slate-400 mb-1">
        Week of {new Date(label as number).toLocaleDateString()}
      </div>

      <div className="text-xs text-slate-300">
        {formatValue ? formatValue(value) : value}
        {unit ? ` ${unit}` : ''}
      </div>
    </div>
  );
}
