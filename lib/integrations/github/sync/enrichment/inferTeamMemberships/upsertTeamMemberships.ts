import { db } from "@/lib/db/client";
import { EvidenceRow } from "./computeEvidenceCounts";
import { inferredTeamMemberships } from "@/lib/db/schema";

type Confidence = "low" | "medium" | "high";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function computeScore(e: EvidenceRow): number {
  const denom = Math.max(1, e.all_team_requested_reviews_for_login);
  const followShare = e.req_to_review / denom; // 0..1
  const directBoost = Math.min(
    1,
    e.user_direct_requests / Math.max(1, e.req_to_review),
  ); // 0..1
  // weights: 80% behavior, 20% direct requests
  return clamp01(0.8 * followShare + 0.2 * directBoost);
}

function toConfidence(score: number): Confidence {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

export async function upsertTeamMemberships(opts: {
  tenantId: string;
  evidence: EvidenceRow[]; // self-only rows (one login)
  algoVersion?: string;
  source?: "heuristic" | "api";
}) {
  const { tenantId, evidence, algoVersion = "v1", source = "heuristic" } = opts;
  if (!evidence?.length) return;

  const now = new Date();

  for (const e of evidence) {
    const score = computeScore(e);
    const confidence = toConfidence(score);

    const row = {
      tenantId,
      githubLogin: e.githubLogin, // self login
      org: e.org,
      teamSlug: e.teamSlug,
      source,
      algoVersion,
      score,
      confidence,
      evidenceCounts: {
        // keep only what we actually use now (add more if you want later)
        req_to_review: e.req_to_review,
        user_direct_requests: e.user_direct_requests,
        all_team_requested_reviews_for_login:
          e.all_team_requested_reviews_for_login,
        // optional, if you kept it in compute:
        ...(typeof (e as any).first_responder_count === "number"
          ? { first_responder_count: (e as any).first_responder_count }
          : {}),
      },
      lastSeenAt: now,
      updatedAt: now,
      // firstSeenAt: leave to DB default on initial insert
    };

    await db
      .insert(inferredTeamMemberships)
      .values(row)
      .onConflictDoUpdate({
        target: [
          inferredTeamMemberships.tenantId,
          inferredTeamMemberships.githubLogin,
          inferredTeamMemberships.org,
          inferredTeamMemberships.teamSlug,
          inferredTeamMemberships.source,
        ],
        set: {
          algoVersion: row.algoVersion,
          score: row.score,
          confidence: row.confidence,
          evidenceCounts: row.evidenceCounts, // Drizzle will JSON-encode for jsonb
          lastSeenAt: row.lastSeenAt,
          updatedAt: row.updatedAt,
        },
      });
  }
}
