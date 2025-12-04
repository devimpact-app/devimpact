import { db } from '@/lib/db/client';
import { githubPrFiles } from '@/lib/db/schema';
import path from 'path';
import { sql } from 'drizzle-orm';
import { SanitizedPRFile } from '../types';

function isTestFile(filename: string): boolean {
  const normalized = filename.toLowerCase();
  const basename = path.basename(normalized, path.extname(normalized));
  const dir = path.dirname(normalized);

  // Check basename for test patterns
  const testBasename =
    basename.endsWith('.test') ||
    basename.endsWith('.spec') ||
    basename.startsWith('test.') ||
    basename.startsWith('spec.') ||
    /\btest\b/.test(basename) ||
    /\bspec\b/.test(basename);

  // Check directory segments for test folders
  const testDir = dir
    .split(path.sep)
    .some(
      (segment) =>
        segment === 'test' ||
        segment === 'tests' ||
        segment === 'spec' ||
        segment === 'specs' ||
        segment === '__tests__' ||
        segment === '__specs__' ||
        segment === '__test__' ||
        segment === '__spec__'
    );

  return testBasename || testDir;
}

export async function storePRFiles(
  prId: string,
  userId: string,
  files: SanitizedPRFile[],
  username: string
): Promise<void> {
  if (files.length === 0) return;

  const rows = files.map((f) => {
    const ext = path.extname(f.filename);
    const dir = path.dirname(f.filename);
    const isTest = isTestFile(f.filename);

    return {
      tenantId: userId,
      prId,
      filename: f.filename,
      previousFilename: f.previous_filename ?? null,
      status: f.status, // "added" | "modified" | "deleted" | "renamed"
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      fileExtension: ext,
      directory: dir,
      isTestFile: isTest,
      authorGithubLogin: username,
      fetchedAt: new Date(),
    };
  });

  await db
    .insert(githubPrFiles)
    .values(rows)
    .onConflictDoUpdate({
      // match the composite unique (prId, filename)
      target: [githubPrFiles.prId, githubPrFiles.filename],
      set: {
        // update the things that can change over time
        status: sql`excluded.status`,
        additions: sql`excluded.additions`,
        deletions: sql`excluded.deletions`,
        changes: sql`excluded.changes`,
        fileExtension: sql`excluded.file_extension`,
        directory: sql`excluded.directory`,
        isTestFile: sql`excluded.is_test_file`,
        previousFilename: sql`COALESCE(excluded.previous_filename, ${githubPrFiles.previousFilename})`,
        fetchedAt: new Date(),
      },
    });
}
