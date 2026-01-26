import {
  CatalogResponse,
  MetricsBatchInput,
  MetricsBatchResult,
  TMetricResult,
} from '@/types/api/metrics';
import { z } from 'zod';

async function fetchJSON<T>(
  url: string,
  init?: RequestInit,
  schema?: z.ZodSchema<T>
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  const resJson = (await res.json()) as unknown;
  const data = (resJson as any).data;
  if (schema) return schema.parse(data);
  return data as T;
}

export function formatMetricValue(
  valueFormat: TMetricResult['valueFormat'],
  rawValue: number | null
): string {
  if (rawValue == null) return '—';

  const vf = valueFormat;
  const scale = vf?.scale ?? 1;
  const decimals = vf?.decimals ?? 0;
  const unitSuffix = vf?.unitSuffix ?? '';

  const scaled = rawValue * scale;
  const formatted = scaled.toFixed(decimals);

  return unitSuffix ? `${formatted} ${unitSuffix}` : formatted;
}

export const MetricsAPI = {
  async getCatalog() {
    return fetchJSON(
      '/api/metrics/catalog',
      { method: 'GET' },
      CatalogResponse
    );
  },

  async runBatch(input: z.infer<typeof MetricsBatchInput>) {
    return fetchJSON(
      '/api/metrics/query',
      { method: 'POST', body: JSON.stringify(input) },
      MetricsBatchResult
    );
  },
};
