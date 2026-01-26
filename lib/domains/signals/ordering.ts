import { Signal } from '@/types/api/signals';

function severityRank(s: Signal): number {
  const sev = s.severity ?? 'attention';
  return sev === 'attention' ? 0 : 1;
}

function occurredAtMs(s: Signal): number {
  if (!s.occurredAt) return 0;
  const t = new Date(s.occurredAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function relatedEntityKey(s: Signal): string | null {
  const ri: any = (s as any).relatedItem;
  if (ri?.entityType && ri?.id) return `${ri.entityType}:${ri.id}`;
  if (ri?.id) return `item:${ri.id}`;
  return null;
}

export function compareSignals(a: Signal, b: Signal): number {
  const sev = severityRank(a) - severityRank(b);
  if (sev !== 0) return sev;

  const time = occurredAtMs(b) - occurredAtMs(a); // newest first
  if (time !== 0) return time;

  const kind = String(a.kind).localeCompare(String(b.kind));
  if (kind !== 0) return kind;

  return String(a.id).localeCompare(String(b.id));
}

export function dedupeByRelatedEntity(signals: Signal[]): Signal[] {
  const bestByKey = new Map<string, Signal>();

  for (const s of signals) {
    const key = relatedEntityKey(s);
    if (!key) {
      bestByKey.set(`__no_key__:${s.id}`, s);
      continue;
    }

    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, s);
      continue;
    }

    const better = compareSignals(s, existing) < 0 ? s : existing;
    bestByKey.set(key, better);
  }

  return Array.from(bestByKey.values());
}
