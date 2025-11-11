import { db } from "@/lib/db/client";
import { repositories } from "@/lib/db/schema";

/**
 * Seed 3 basic repositories for a tenant (tenant=user for now).
 * Uses upsert on (tenantId, provider, fullName).
 */
export async function seedRepositories(
  tenantId: string,
  opts?: { provider?: "github" },
) {
  const provider = opts?.provider ?? "github";

  const sample = [
    {
      externalId: "746391234", // GitHub repo numeric id as string
      externalNodeId: "R_kgDOLabcde", // GitHub repo node_id
      fullName: "acme/frontend",
      owner: "acme",
      name: "frontend",
      isPrivate: true,
    },
    {
      externalId: "746391235",
      externalNodeId: "R_kgDOLabcdn",
      fullName: "acme/api",
      owner: "acme",
      name: "api",
      isPrivate: true,
    },
    {
      externalId: "746391236",
      externalNodeId: "R_kgDOLabcdo",
      fullName: "acme/infra",
      owner: "acme",
      name: "infra",
      isPrivate: true,
    },
  ];

  const results = [];
  for (const r of sample) {
    const [row] = await db
      .insert(repositories)
      .values({
        tenantId,
        provider,
        externalId: r.externalId,
        externalNodeId: r.externalNodeId,
        fullName: r.fullName,
        owner: r.owner,
        name: r.name,
        isPrivate: r.isPrivate,
        selected: true,
        // leave lastSyncedAt/syncCursor/syncError null for fresh seed
      })
      .onConflictDoUpdate({
        target: [
          repositories.tenantId,
          repositories.provider,
          repositories.fullName,
        ],
        set: {
          // keep selection on, and refresh mutable fields (handles renames)
          externalId: r.externalId, // if you later switch unique key to externalId, this helps migration
          externalNodeId: r.externalNodeId,
          owner: r.owner,
          name: r.name,
          isPrivate: r.isPrivate,
          selected: true,
        },
      })
      .returning({
        id: repositories.id,
        fullName: repositories.fullName,
        externalId: repositories.externalId,
      });

    results.push(row);
  }

  return results;
}
