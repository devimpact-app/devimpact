/* eslint-disable no-console */
import { InferSelectModel } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { githubPrFiles, githubPrs } from "@/lib/db/schema";
import { SQL, and, eq } from "drizzle-orm";

type DB = typeof defaultDb;
type PRRow = InferSelectModel<typeof githubPrs>;

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function extWeight(repoFullName: string) {
  if (repoFullName.endsWith("/frontend"))
    return [".tsx", ".ts", ".css", ".md", ".json"];
  if (repoFullName.endsWith("/api"))
    return [".ts", ".ts", ".json", ".md", ".sql"];
  return [".tf", ".sh", ".yml", ".md", ".json"];
}
function dirFor(repo: string, ext: string) {
  if (repo.endsWith("/frontend")) {
    if (ext === ".css") return pick(["src/styles", "src/components"]);
    if (ext === ".tsx")
      return pick(["src/components", "src/pages", "src/features"]);
    if (ext === ".ts") return pick(["src/lib", "src/utils", "src/hooks"]);
    return pick([".", "docs", "config"]);
  }
  if (repo.endsWith("/api")) {
    if (ext === ".ts") return pick(["src/routes", "src/services", "src/lib"]);
    if (ext === ".sql") return "migrations";
    return pick([".", "docs", "config"]);
  }
  if (ext === ".tf")
    return pick(["terraform/environments/prod", "terraform/modules/network"]);
  if (ext === ".yml") return pick([".github/workflows", "ops/ci"]);
  return pick(["ops", "scripts", "docs"]);
}
function baseName(ext: string) {
  const base = [
    "auth",
    "user",
    "project",
    "review",
    "token",
    "dashboard",
    "settings",
    "webhook",
    "sync",
    "cache",
  ];
  const t = pick(base);
  if (ext === ".tsx") return `${t[0].toUpperCase() + t.slice(1)}Card`;
  if (ext === ".ts") return `${t}-${rand(1, 9)}`;
  if (ext === ".tf") return `${t}_module`;
  if (ext === ".yml") return `${t}-pipeline`;
  if (ext === ".sql") return `V${rand(12, 99)}__${t}`;
  return t;
}
function makeFilename(repo: string, ext: string, testBias = 0.25) {
  const dir = dirFor(repo, ext);
  const isTest = Math.random() < testBias && (ext === ".ts" || ext === ".tsx");
  const name = baseName(ext) + (isTest ? ".test" : "");
  const file = `${name}${ext}`;
  const path = dir === "." ? file : `${dir}/${file}`;
  return { path, isTest };
}
function splitTotals(total: number, parts: number) {
  const cuts = Array.from({ length: parts - 1 }, () => Math.random()).sort(
    (a, b) => a - b,
  );
  const segs = [0, ...cuts, 1].map((x, i, arr) => arr[i] - (arr[i - 1] ?? 0));
  const raw = segs.map((s) => Math.max(1, Math.round(s * total)));
  const diff = raw.reduce((a, b) => a + b, 0) - total;
  if (diff !== 0) raw[raw.length - 1] = Math.max(1, raw[raw.length - 1] - diff);
  return raw;
}

export async function seedPrFiles(params: {
  db?: DB; // optional tx or db
  pr: PRRow; // PR row that was just inserted/returned
  tenantId: string;
  authorGithubLogin: string; // author of the PR (for files)
  repoDefaultBranch?: string; // default "main"
}) {
  const db = params.db ?? defaultDb;
  const { pr, tenantId, authorGithubLogin } = params;
  const defaultBranch = params.repoDefaultBranch ?? "main";

  // how many files?
  const fileCount = Math.max(1, pr.changedFiles ?? rand(3, 8));
  const exts = extWeight(pr.repoFullName);

  // statuses
  const statuses = Array.from({ length: fileCount }, () => {
    const r = Math.random();
    if (r < 0.7) return "modified";
    if (r < 0.9) return "added";
    if (r < 0.97) return "deleted";
    return "renamed";
  }) as Array<"modified" | "added" | "deleted" | "renamed">;

  // filenames
  const files: {
    filename: string;
    previousFilename?: string | null;
    isTestFile: boolean;
    status: "modified" | "added" | "deleted" | "renamed";
  }[] = [];
  const used = new Set<string>();

  for (const status of statuses) {
    const ext = pick(exts);
    const { path, isTest } = makeFilename(pr.repoFullName, ext, 0.25);
    if (used.has(path)) continue;
    used.add(path);

    if (status === "renamed") {
      const old = path.replace(/([^/]+)$/, (m) => `old_${m}`);
      files.push({
        filename: path,
        previousFilename: old,
        isTestFile: isTest,
        status,
      });
    } else {
      files.push({
        filename: path,
        previousFilename: null,
        isTestFile: isTest,
        status,
      });
    }
  }

  // distribute totals
  const totalAdds = Math.max(0, pr.additions ?? rand(30, 300));
  const totalDels = Math.max(
    0,
    pr.deletions ?? rand(10, Math.floor(totalAdds * 0.6)),
  );
  const adds = splitTotals(totalAdds, files.length);
  const dels = splitTotals(totalDels, files.length);

  // upserts
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    let a = adds[i];
    let d = dels[i];
    if (f.status === "deleted") {
      d = Math.max(d, rand(10, 60));
      a = Math.min(a, rand(0, 3));
    }
    if (f.status === "added") {
      a = Math.max(a, rand(15, 80));
      d = Math.min(d, rand(0, 5));
    }
    if (f.status === "renamed") {
      a = rand(1, 20);
      d = rand(1, 20);
    }

    const fileExt = f.filename.includes(".")
      ? `.${f.filename.split(".").pop()!}`
      : null;
    const dir = f.filename.includes("/")
      ? f.filename.slice(0, f.filename.lastIndexOf("/"))
      : ".";
    const blobUrl = `https://github.com/${pr.repoFullName}/blob/${defaultBranch}/${f.filename}`;

    await db
      .insert(githubPrFiles)
      .values({
        tenantId,
        prId: pr.id,
        authorGithubLogin,
        filename: f.filename,
        previousFilename: f.previousFilename ?? null,
        status: f.status,
        additions: a,
        deletions: d,
        changes: a + d,
        fileExtension: fileExt ?? null,
        directory: dir,
        isTestFile: f.isTestFile,
        blobUrl,
      })
      .onConflictDoUpdate({
        target: [githubPrFiles.prId, githubPrFiles.filename],
        set: {
          previousFilename: f.previousFilename ?? null,
          status: f.status,
          additions: a,
          deletions: d,
          changes: a + d,
          fileExtension: fileExt ?? null,
          directory: dir,
          isTestFile: f.isTestFile,
          blobUrl,
        },
      });
  }

  return { count: files.length };
}
