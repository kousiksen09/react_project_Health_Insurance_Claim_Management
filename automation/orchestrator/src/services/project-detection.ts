import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Generic, repo-agnostic project layout detection used as a fallback when a project
 * doesn't set explicit VALIDATION_*_CWD env overrides. Bounded to a shallow depth and
 * wrapped in a timeout so a huge, slow, or cloud-sync-placeholder repo (OneDrive/SharePoint
 * "Files On-Demand", network shares, etc.) can never hang orchestrator startup or a run —
 * it just falls back to "not detected" and the caller should be told to set an override.
 */

const IGNORE_DIRS = new Set([
  'node_modules',
  'bin',
  'obj',
  'dist',
  'build',
  'out',
  '.git',
  '.vs',
  '.vscode',
  '.idea',
  'automation',
  'artifacts',
  'coverage',
  'packages',
]);

const DETECTION_TIMEOUT_MS = 4000;
const MAX_DEPTH = 1;

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  const result = await Promise.race([promise, timeout]);
  clearTimeout(timer!);
  return result;
}

async function findDirShallow(
  repoRoot: string,
  matches: (fileName: string) => boolean,
  excludeDirName?: (dirName: string) => boolean,
): Promise<string | null> {
  const queue: Array<{ rel: string; depth: number }> = [{ rel: '', depth: 0 }];

  while (queue.length) {
    const { rel, depth } = queue.shift()!;
    let entries;
    try {
      entries = await fs.readdir(path.join(repoRoot, rel), { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.isFile() && matches(entry.name)) {
        return rel;
      }
    }

    if (depth < MAX_DEPTH) {
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          !IGNORE_DIRS.has(entry.name.toLowerCase()) &&
          !excludeDirName?.(entry.name)
        ) {
          queue.push({ rel: path.join(rel, entry.name), depth: depth + 1 });
        }
      }
    }
  }

  return null;
}

/** Finds the first directory (repo root or one level down) containing a .sln or .csproj. Skips test projects. */
export async function detectBackendDir(repoRoot: string): Promise<string | null> {
  const search = findDirShallow(
    repoRoot,
    (name) => name.endsWith('.sln') || name.endsWith('.csproj'),
    (dirName) => /tests?$/i.test(dirName),
  );
  return withTimeout(search, DETECTION_TIMEOUT_MS, null);
}

/** Finds the first directory (repo root or one level down) whose name suggests it holds test projects. */
export async function detectBackendTestDir(repoRoot: string): Promise<string | null> {
  const search = findDirShallow(repoRoot, (name) => name.endsWith('.csproj') && /tests?/i.test(name));
  return withTimeout(search, DETECTION_TIMEOUT_MS, null);
}

/** Finds the first directory (repo root or one level down) containing a package.json. */
export async function detectFrontendDir(repoRoot: string): Promise<string | null> {
  const search = findDirShallow(repoRoot, (name) => name === 'package.json');
  return withTimeout(search, DETECTION_TIMEOUT_MS, null);
}
