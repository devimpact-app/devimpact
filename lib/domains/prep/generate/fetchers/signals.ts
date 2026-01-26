import { Signal } from '@/types/api/signals';
import { PrepSignalForLLM } from '../types';
import { toDate } from '@/lib/utils/date';
import { buildSignals } from '@/lib/domains/signals';

const DEFAULT_MAX_SIGNALS = 10;

export type FetchPrepSignalsResponse = {
  full: Signal[];
  llm: PrepSignalForLLM[];
};

function toLLMSignal(args: {
  signal: Signal;
  windowStart: Date;
  windowEnd: Date;
}): PrepSignalForLLM {
  const { signal, windowStart, windowEnd } = args;

  const evidence = (signal.evidence ?? []).slice(0, 3).map((e) => {
    const unitDisplay = e.unit ? ` ${e.unit}` : '';
    return {
      label: e.label,
      value: `${e.value}${unitDisplay}`,
      unit: e.unit,
    };
  });

  const related = signal.relatedItem;

  const occurredAt = signal.occurredAt ?? related?.occurredAt ?? undefined;
  const occurredAtIso = occurredAt
    ? toDate(occurredAt).toISOString()
    : undefined;

  return {
    id: signal.id,
    kind: signal.kind,
    severity: signal.severity ?? 'attention',
    window: {
      startIso: windowStart.toISOString(),
      endIso: windowEnd.toISOString(),
    },
    text: signal.text,
    primary: related
      ? {
          entityType: related.entityType,
          id: related.id,
          title: related.title,
          subtitle: related.subtitle,
          url: related.htmlUrl,
          occurredAtIso,
        }
      : undefined,
    evidence: evidence.length ? evidence : undefined,
  };
}

export async function fetchSignalsForWindow(params: {
  tenantId: string;
  start: Date;
  end: Date;
  limit?: number;
}): Promise<FetchPrepSignalsResponse> {
  const { tenantId, start, end, limit = DEFAULT_MAX_SIGNALS } = params;

  const { signals, windowStart, windowEnd } = await buildSignals({
    userId: tenantId,
    start: start,
    end: end,
  });

  const llm = signals
    .slice(0, limit)
    .map((signal) => toLLMSignal({ signal, windowStart, windowEnd }));

  return {
    full: signals,
    llm,
  };
}
