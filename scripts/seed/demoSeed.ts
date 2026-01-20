import 'dotenv/config';
import { closeDb, db } from '@/lib/db/client';
import {
  githubPrCommits,
  githubPrFiles,
  githubPrs,
  githubReviewComments,
  githubReviews,
  githubTimelineEvents,
  inferredTeamMemberships,
  pullRequests,
  githubRepos,
  reviews,
  users,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { seedRepositories } from './helpers/seedRepositories';
import { seedAuthoredPRs } from './helpers/seedAuthoredPRs';
import { seedReviewedPRs } from './helpers/seedReviewedPRs';
import { inferTeamMemberships } from '@/lib/integrations/github/sync/enrichment/inferTeamMemberships/inferTeamMemberships';
import { batchNormalizeUserPRs } from '@/lib/domains/pull-requests/service/normalization/pr-normalizer';
import { batchNormalizeUserReviews } from '@/lib/domains/pull-requests/service/normalization/review-normalizer';

const argv = process.argv.slice(2);
const hasFlag = (f: string) => argv.includes(f);

async function resetTenantData(tenantId: string) {
  // delete child tables first
  await db
    .delete(inferredTeamMemberships)
    .where(eq(inferredTeamMemberships.tenantId, tenantId));
  await db.delete(reviews).where(eq(reviews.tenantId, tenantId));
  await db.delete(pullRequests).where(eq(pullRequests.tenantId, tenantId));
  await db
    .delete(githubPrCommits)
    .where(eq(githubPrCommits.tenantId, tenantId));
  await db.delete(githubPrFiles).where(eq(githubPrFiles.tenantId, tenantId));
  await db
    .delete(githubTimelineEvents)
    .where(eq(githubTimelineEvents.tenantId, tenantId));
  await db
    .delete(githubReviewComments)
    .where(eq(githubReviewComments.tenantId, tenantId));
  await db.delete(githubReviews).where(eq(githubReviews.tenantId, tenantId));
  await db.delete(githubPrs).where(eq(githubPrs.tenantId, tenantId));
  await db.delete(githubRepos).where(eq(githubRepos.tenantId, tenantId));
}

async function seedGithubActivity(
  tenantId: string,
  githubUsername: string,
  opts: { verbose?: boolean } = {}
) {
  console.log('Seeding repos');
  const repos = await seedRepositories(tenantId);
  // Map to the shape the PR seeder expects
  const repoInputs = repos.map((r) => ({
    fullName: r.fullName, // ensure you returned this from seedRepositories
    owner: r.fullName.split('/')[0],
    name: r.fullName.split('/')[1],
  }));

  console.log('Seeding authored PRs');
  const prs = await seedAuthoredPRs({
    tenantId,
    authorGithubLogin: githubUsername,
    repos: repoInputs,
    lookbackDays: 90,
  });

  console.log('Seeding reviewed PRs');
  const prs2 = await seedReviewedPRs({
    tenantId,
    reviewerGithubLogin: githubUsername,
    repos: repoInputs,
    lookbackDays: 90,
  });

  console.log('Inferring team memberships');
  await inferTeamMemberships({
    tenantId,
    since: new Date(Date.now() - 90 * 864e5),
    username: githubUsername,
  });

  console.log('Normalizing PRs and reviews');
  await batchNormalizeUserPRs(tenantId, githubUsername);
  await batchNormalizeUserReviews(tenantId, githubUsername);
}

async function main() {
  try {
    const reset = hasFlag('--reset');
    const [me] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'iwrichard@proton.me'))
      .limit(1);

    if (!me) throw new Error('Seed needs an existing user with that email');

    const tenantId = me.id;

    if (reset) {
      console.log('🔄 Resetting existing seed data for tenant:', tenantId);
      await resetTenantData(tenantId);
    }

    await db.transaction(async (tx) => {
      await seedGithubActivity(tenantId, me.githubUsername, { verbose: true });
    });
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1; // mark failure
  } finally {
    await closeDb(); // <-- important
    process.exit(); // ensures process ends even if something else kept a handle open
  }
}

main();
