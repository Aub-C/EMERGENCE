import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { allChangedPaths, parseChangedFilesTsv } from './changed-files.mjs';

const execFileAsync = promisify(execFile);

export function pathMatches(path, pattern) {
  const normalizedPath = String(path).replace(/^\.\//, '');
  const normalizedPattern = String(pattern).replace(/^\.\//, '');

  if (normalizedPattern.endsWith('/**')) {
    const prefix = normalizedPattern.slice(0, -3).replace(/\/$/, '');
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  }

  return normalizedPath === normalizedPattern;
}

export function evaluateOwnerAuthority({ changedFiles, actor, author, authority, protectedPaths }) {
  const owner = String(authority?.sole_authority_github_login ?? '').trim().toLowerCase();
  const ownerOnlyPaths = protectedPaths ?? authority?.owner_only_paths ?? [];
  const protectedChanges = changedFiles.filter((file) => ownerOnlyPaths.some((pattern) => pathMatches(file, pattern)));

  if (protectedChanges.length === 0) {
    return { accepted: true, protectedChanges: [], reason: 'no owner-controlled governance or red-zone paths changed' };
  }

  const normalizedActor = String(actor ?? '').trim().toLowerCase();
  const normalizedAuthor = String(author ?? '').trim().toLowerCase();
  const ownerControlled = Boolean(owner) && normalizedActor === owner && normalizedAuthor === owner;

  return {
    accepted: ownerControlled,
    protectedChanges,
    reason: ownerControlled
      ? 'owner-controlled governance or red-zone change attributed to the sole authority; automatic merge remains forbidden'
      : 'governance and red-zone paths may be changed only by Aub-C personally'
  };
}

export async function changedFilesFromEnvironment({ cwd, env = process.env }) {
  const explicit = String(env.EMERGENCE_CHANGED_FILES ?? '').trim();
  if (explicit) {
    return allChangedPaths(parseChangedFilesTsv(explicit));
  }

  const base = String(env.EMERGENCE_BASE_SHA ?? '').trim();
  const head = String(env.EMERGENCE_HEAD_SHA ?? '').trim();
  if (!base || !head || /^0+$/.test(base)) return [];

  // --name-status keeps rename/copy sources; --name-only would report only the
  // destination path and let a rename escape protected-path matching.
  const { stdout } = await execFileAsync(
    'git',
    ['diff', '--name-status', '--find-renames', '--diff-filter=ACMRD', base, head],
    { cwd, maxBuffer: 2 * 1024 * 1024 }
  );

  const paths = new Set();
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [, ...pathColumns] = line.split('\t');
    for (const column of pathColumns) {
      const path = column.trim();
      if (path) paths.add(path);
    }
  }
  return [...paths];
}
