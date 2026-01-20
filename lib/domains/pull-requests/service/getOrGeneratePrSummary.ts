import { prSummaries, pullRequests } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { createHash } from 'crypto';
import { generateAuthoredPrSummary } from './llm/authored/generate';
import { PRSummarizationInput } from './llm/authored/types';
import { loadPrSummaryContext } from './llm/authored/context';
import { buildPRSummarizationInput } from './llm/authored/buildInput';
import { AiConfig } from '@/lib/integrations/openai/config';

function hashPrInput(input: PRSummarizationInput, model: string): string {
  const payload = {
    model,
    input,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function getOrGeneratePrSummary(opts: {
  tenantId: string;
  prId: string; // normalized pr row
  useReviewedPrompt?: boolean;
  force?: boolean; // if we want to always re-generate
}) {
  const { tenantId, prId, force, useReviewedPrompt = false } = opts;

  const results = await db
    .select({
      pr: pullRequests,
      summary: prSummaries,
    })
    .from(pullRequests)
    .leftJoin(
      prSummaries,
      and(
        eq(prSummaries.tenantId, pullRequests.tenantId),
        eq(prSummaries.prId, pullRequests.id)
      )
    )
    .where(and(eq(pullRequests.id, prId), eq(pullRequests.tenantId, tenantId)))
    .limit(1);
  if (results.length === 0) throw new Error(`PR not found for id ${prId}`);
  const prAndSummaryRow = results[0];
  const summary = prAndSummaryRow.summary;
  const needsNewSummary =
    !summary ||
    (prAndSummaryRow.pr.sourceUpdatedAt &&
      summary.prUpdatedAt < prAndSummaryRow.pr.sourceUpdatedAt);

  if (!force && !needsNewSummary) {
    return {
      row: summary,
      source: 'cache' as const,
    };
  }

  const ctx = await loadPrSummaryContext({ tenantId, prId });
  if (!ctx) throw new Error(`PR not found for id ${prId}`);

  const input = buildPRSummarizationInput({
    normPr: ctx.normPr,
    files: ctx.files,
    reviews: ctx.reviews,
    reviewComments: ctx.reviewComments,
  });

  const result = await generateAuthoredPrSummary(input);

  const prUpdatedAt = input.pr.updatedAt ?? new Date();
  const inputHash = hashPrInput(input, AiConfig.models.summarize);
  const row = {
    tenantId,
    prId,
    repoFullName: input.pr.repoFullName,
    prNumber: input.pr.prNumber,
    prUpdatedAt: prUpdatedAt,
    model: AiConfig.models.summarize,
    promptVersion: '1.0',
    shortSummary: result.shortSummary,
    longSummary: result.longSummary,
    highlights: result.highlights,
    typeTags: result.typeTags,
    domainTags: result.domainTags,
    reviewFrictionTags: result.reviewFrictionTags,
    inputHash,
  };

  const upserted = await db
    .insert(prSummaries)
    .values(row)
    .onConflictDoUpdate({
      target: [prSummaries.tenantId, prSummaries.prId],
      set: {
        inputHash,
        shortSummary: result.shortSummary,
        longSummary: result.longSummary,
        highlights: result.highlights,
        typeTags: result.typeTags,
        domainTags: result.domainTags,
        reviewFrictionTags: result.reviewFrictionTags,
        model: AiConfig.models.summarize,
        prUpdatedAt: prUpdatedAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    row: upserted[0],
    source: 'fresh' as const,
  };
}
