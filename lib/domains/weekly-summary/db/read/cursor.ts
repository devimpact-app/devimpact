import z from 'zod';

export const WeeklySummaryCursorSchema = z.object({
  sortAtIso: z.iso.datetime(),
  id: z.uuid(),
});

export type WeeklySummaryCursor = z.infer<typeof WeeklySummaryCursorSchema>;

export function encodeWeeklySummaryCursor(sortAtIso: string, id: string) {
  return `${sortAtIso}__${id}`;
}

export function decodeWeeklySummaryCursor(
  cursor: string
): { sortAt: Date; id: string } | null {
  const parts = cursor.split('__');
  if (parts.length !== 2) return null;
  const [iso, id] = parts;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return { sortAt: d, id };
}
