export const isBulletEditable = (b: {
  source: 'llm' | 'user';
  userEditedAt: Date | null;
  deletedAt: Date | null;
}) => b.source === 'llm' && !b.userEditedAt && !b.deletedAt;

export function dedupe(ids: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function sameStringArray(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function uniqArray<T>(arr: T[]) {
  return Array.from(new Set(arr));
}
