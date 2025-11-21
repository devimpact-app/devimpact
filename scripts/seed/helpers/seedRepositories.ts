import { db } from '@/lib/db/client'
import { githubRepos } from '@/lib/db/schema'

/**
 * Seed 3 basic repositories for a tenant (tenant=user for now).
 * Uses upsert on (tenantId, provider, fullName).
 */
export async function seedRepositories(
  tenantId: string,
  opts?: { provider?: 'github' }
) {
  const provider = opts?.provider ?? 'github'

  const sample = [
    {
      externalId: '746391234', // GitHub repo numeric id as string
      externalNodeId: 'R_kgDOLabcde', // GitHub repo node_id
      fullName: 'acme/frontend',
      owner: 'acme',
      name: 'frontend',
      isPrivate: true,
    },
    {
      externalId: '746391235',
      externalNodeId: 'R_kgDOLabcdn',
      fullName: 'acme/api',
      owner: 'acme',
      name: 'api',
      isPrivate: true,
    },
    {
      externalId: '746391236',
      externalNodeId: 'R_kgDOLabcdo',
      fullName: 'acme/infra',
      owner: 'acme',
      name: 'infra',
      isPrivate: true,
    },
  ]

  const results = []
  for (const r of sample) {
    const [row] = await db
      .insert(githubRepos)
      .values({
        tenantId,
        githubRepoId: r.externalId,
        fullName: r.fullName,
        owner: r.owner,
        name: r.name,
        isPrivate: r.isPrivate,
      })
      .onConflictDoUpdate({
        target: [githubRepos.tenantId, githubRepos.githubRepoId],
        set: {
          githubRepoId: r.externalId,
          owner: r.owner,
          name: r.name,
          isPrivate: r.isPrivate,
        },
      })
      .returning({
        id: githubRepos.id,
        fullName: githubRepos.fullName,
        externalId: githubRepos.githubRepoId,
      })

    results.push(row)
  }

  return results
}
