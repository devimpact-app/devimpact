import { db } from "@/lib/db/client";
import { githubPrFiles } from "@/lib/db/schema";
import path from "path";
import { GitHubPRFile } from "../api/types";
import { sql } from "drizzle-orm";

export async function storePRFiles(
  prId: string,
  files: GitHubPRFile[],
  username: string,
): Promise<void> {
  if (files.length === 0) return;

  const rows = files.map((f) => {
    const ext = path.extname(f.filename);
    const dir = path.dirname(f.filename);
    const isTest =
      f.filename.includes("test") ||
      f.filename.includes("spec") ||
      f.filename.includes("__tests__") ||
      f.filename.includes(".test.") ||
      f.filename.includes(".spec.") ||
      dir.includes("test") ||
      dir.includes("spec") ||
      dir.includes("__tests__");

    return {
      prId,
      filename: f.filename,
      previousFilename: f.previous_filename ?? null,
      status: f.status, // "added" | "modified" | "deleted" | "renamed"
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      fileExtension: ext || null,
      directory: dir,
      isTestFile: isTest,
      blobUrl: f.blob_url ?? null,
      githubLogin: username,
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
        blobUrl: sql`excluded.blob_url`,
        fileExtension: sql`excluded.file_extension`,
        directory: sql`excluded.directory`,
        isTestFile: sql`excluded.is_test_file`,
        previousFilename: sql`COALESCE(excluded.previous_filename, ${githubPrFiles.previousFilename})`,
        fetchedAt: new Date(),
      },
    });
}
