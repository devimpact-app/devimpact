import { db } from "@/lib/db/client";
import { githubPrFiles } from "@/lib/db/schema";
import path from "path";
import { GitHubPRFile } from "../api/types";

export async function storePRFiles(
  prId: string,
  files: GitHubPRFile[],
  username: string,
): Promise<void> {
  if (files.length === 0) return;

  await db
    .insert(githubPrFiles)
    .values(
      files.map((f) => {
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
          previousFilename: f.previous_filename || null,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          fileExtension: ext || null,
          directory: dir,
          isTestFile: isTest,
          blobUrl: f.blob_url,
          githubLogin: username,
        };
      }),
    )
    .onConflictDoNothing();
}
