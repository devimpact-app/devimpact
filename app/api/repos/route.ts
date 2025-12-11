import { auth } from '@/lib/auth';
import { jsonOK, jsonServerError, jsonUnauthorized } from '../_lib/http';
import { withSentryUser } from '@/lib/withSentryUser';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { githubRepos } from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { AvailableGithubResponseSchema } from '@/types/api/repos';

export const GET = withSentryUser(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) return jsonUnauthorized('Unauthorized');

  const userId = session.user.id;

  const rows = await db
    .select()
    .from(githubRepos)
    .where(and(eq(githubRepos.tenantId, userId)))
    .orderBy(desc(githubRepos.pushedAtGitHub))
    .limit(300);

  const repos = rows.map((row) => ({
    id: row.id,
    isSelected: row.isSelected,
    githubRepoId: row.githubRepoId,
    owner: row.owner,
    name: row.name,
    fullName: row.fullName,
    isPrivate: row.isPrivate,
    pushedAt: row.pushedAtGitHub,
  }));

  const parsed = AvailableGithubResponseSchema.safeParse({
    repos,
  });

  if (!parsed.success) {
    console.log(parsed.error);
    return jsonServerError('Failed to parse repos list');
  }

  return jsonOK(parsed.data);
});
