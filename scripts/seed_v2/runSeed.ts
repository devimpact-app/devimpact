import 'dotenv/config';
import { closeDb, db } from '@/lib/db/client';
import { githubPrs, prSummaries, pullRequests, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { resetTenantData } from './reset';
import { buildSeedTimeContext } from './helpers';
import { readFile } from 'fs/promises';
import {
  SeedPullRequestsFile,
  SeedPullRequestsFileSchema,
} from './schema/seedPullRequest';
import path from 'path';
import { seedPullRequestToDbRows } from './derive/from-seed-pull-request';

export async function loadSeedPullRequests(
  filepath: string
): Promise<SeedPullRequestsFile> {
  const raw = await readFile(filepath, 'utf-8');
  const json = JSON.parse(raw);
  const parsed = SeedPullRequestsFileSchema.parse(json);
  return parsed;
}

async function seedAccount(tenantId: string, githubUsername: string) {
  const timeCtx = buildSeedTimeContext();

  const prSeedPath = path.join(
    process.cwd(),
    'scripts',
    'seed_v2',
    'data',
    'pull_requests.json'
  );
  const prSeed = await loadSeedPullRequests(prSeedPath);
  const mappedPrs = prSeed.pullRequests.map((spr) =>
    seedPullRequestToDbRows(spr, {
      tenantId,
      githubUsername,
      timeCtx,
    })
  );
  mappedPrs.sort((a, b) => a.pr.createdAt.getTime() - b.pr.createdAt.getTime());

  const githubPrRows = mappedPrs.map((m) => m.githubPr);
  const prRows = mappedPrs.map((m) => m.pr);
  const summaryRows = mappedPrs.map((m) => m.summary);

  await db.transaction(async (tx) => {
    await tx.insert(githubPrs).values(githubPrRows);
    await tx.insert(pullRequests).values(prRows);
    await tx.insert(prSummaries).values(summaryRows);
  });

  // TODO: Trigger activity events/threading

  return {
    prsSeeded: prRows.length,
    summariesSeeded: summaryRows.length,
    startMondayISO: timeCtx.startMonday.toISOString(),
  };
}

const argv = process.argv.slice(2);
const hasFlag = (f: string) => argv.includes(f);

async function main() {
  try {
    const reset = hasFlag('--reset');
    const [me] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'ianr620@gmail.com'))
      .limit(1);

    if (!me) throw new Error('Seed needs an existing user with that email');

    const tenantId = me.id;

    if (reset) {
      console.log('🔄 Resetting existing seed data for tenant:', tenantId);
      await resetTenantData(tenantId);
    }

    const response = await seedAccount(tenantId, me.githubUsername);
    console.log(response);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await closeDb();
    process.exit();
  }
}

main();
