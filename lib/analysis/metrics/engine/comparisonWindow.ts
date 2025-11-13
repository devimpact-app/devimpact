import { toDate } from "@/lib/utils/date";
import { ComparisonSpec } from "../types/input";

export type ComparisonWindow =
  | { kind: "none" }
  | {
      kind: Exclude<ComparisonSpec["kind"], "none">;
      start: Date;
      end: Date;
      label: string;
    };

export function computeComparisonWindow({
  primaryStart,
  primaryEnd,
  cmp,
}: {
  primaryStart: Date;
  primaryEnd: Date;
  cmp: ComparisonSpec | undefined;
}): ComparisonWindow {
  if (!cmp || cmp.kind === "none") return { kind: "none" };

  const normStart = toDate(primaryStart);
  const normEnd = toDate(primaryEnd);
  if (!(normStart < normEnd)) return { kind: "none" }; // guard

  switch (cmp.kind) {
    case "previous_period": {
      const durMs = normEnd.getTime() - normStart.getTime();
      const end = new Date(normStart.getTime()); // shifts back by duration
      const start = new Date(end.getTime() - durMs);
      return {
        kind: "previous_period",
        start,
        end,
        label: "Previous period",
      };
    }

    case "custom": {
      const start = toDate(cmp.start);
      const end = toDate(cmp.end);
      if (!(start < end)) return { kind: "none" };
      return { kind: "custom", start, end, label: "Custom comparison" };
    }
  }
}
