import { db } from "@/lib/db/client";
import { githubRepos } from "@/lib/db/schema";
import { RepoMetadata } from "@/types/api/sync";

export async function upsertGithubRepoForTenant(
  tenantId: string,
  meta: RepoMetadata,
) {
  const githubRepoId = String(meta.id);

  const [row] = await db
    .insert(githubRepos)
    .values({
      tenantId,
      githubRepoId,

      owner: meta.ownerLogin,
      name: meta.name,
      fullName: meta.fullName,

      isPrivate: meta.private,
      isArchived: meta.archived,
      visibility: meta.visibility,

      defaultBranch: meta.defaultBranch,
      primaryLanguage: meta.primaryLanguage,

      createdAtGitHub: meta.createdAt ? new Date(meta.createdAt) : null,
      pushedAtGitHub: meta.pushedAt ? new Date(meta.pushedAt) : null,
    })
    .onConflictDoUpdate({
      target: [githubRepos.tenantId, githubRepos.githubRepoId],
      set: {
        owner: meta.ownerLogin,
        name: meta.name,
        fullName: meta.fullName,
        isPrivate: meta.private,
        isArchived: meta.archived,
        visibility: meta.visibility,
        defaultBranch: meta.defaultBranch,
        primaryLanguage: meta.primaryLanguage,
        createdAtGitHub: meta.createdAt ? new Date(meta.createdAt) : null,
        pushedAtGitHub: meta.pushedAt ? new Date(meta.pushedAt) : null,
      },
    })
    .returning({ id: githubRepos.id });

  return row.id;
}
