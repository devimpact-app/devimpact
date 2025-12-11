import { db } from '@/lib/db/client';
import { githubRepos } from '@/lib/db/schema';
import { RepoMetadata } from '@/types/api/sync';
import { sql } from 'drizzle-orm';

export async function upsertGithubRepoForTenant(
  tenantId: string,
  repos: RepoMetadata[],
  isSelected: boolean = true
): Promise<number> {
  const inputs = repos.map((r) => ({
    tenantId,
    githubRepoId: String(r.id),
    isSelected,

    owner: r.ownerLogin,
    name: r.name,
    fullName: r.fullName,

    isPrivate: r.private,
    isArchived: r.archived,
    visibility: r.visibility,

    defaultBranch: r.defaultBranch,
    primaryLanguage: r.primaryLanguage,

    createdAtGitHub: r.createdAt ? new Date(r.createdAt) : null,
    pushedAtGitHub: r.pushedAt ? new Date(r.pushedAt) : null,
  }));
  const rows = await db
    .insert(githubRepos)
    .values(inputs)
    .onConflictDoUpdate({
      target: [githubRepos.tenantId, githubRepos.githubRepoId],
      set: {
        owner: sql`excluded.owner`,
        name: sql`excluded.name`,
        fullName: sql`excluded.full_name`,
        isPrivate: sql`excluded.is_private`,
        isArchived: sql`excluded.is_archived`,
        visibility: sql`excluded.visibility`,
        defaultBranch: sql`excluded.default_branch`,
        primaryLanguage: sql`excluded.primary_language`,
        pushedAtGitHub: sql`excluded.pushed_at_github`,
      },
    })
    .returning({ id: githubRepos.id });

  return rows.length;
}
