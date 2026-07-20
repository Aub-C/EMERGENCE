import { execFile } from 'node:child_process';
import { dirname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { discoverCells, findCellForPath } from './lib/cells.mjs';
import { pathMatches } from '../control-plane/owner-authority.mjs';

const execFileAsync = promisify(execFile);

const policy = JSON.parse(await readFile(new URL('../control-plane/policy.json', import.meta.url), 'utf8'));
const restrictedPatterns = [
  ...(policy.red_zone_paths ?? []),
  ...(policy.rule_authority?.owner_only_paths ?? [])
];
const isOwnerOnly = (path) => restrictedPatterns.some((pattern) => pathMatches(path, pattern));

const catalog = await discoverCells();

// There is no backlog here on purpose, which makes "what should I build?" the
// hardest step of contributing. A tracked file that no cell claims, sitting
// beside siblings that are claimed, is a concrete and checkable gap — it is how
// the missing entry for scripts/preflight.mjs was found. Surfacing it costs
// nothing and turns the emptiest part of the on-ramp into a first mutation.
const coverage = await trackedFiles();
const tracked = coverage.files;
const unclaimed = tracked.filter((file) => !findCellForPath(catalog, file));
const claimedDirectories = new Map();
for (const file of tracked) {
  if (unclaimed.includes(file)) continue;
  const directory = dirname(file);
  if (!claimedDirectories.has(directory)) claimedDirectories.set(directory, file);
}

// The repository root is miscellaneous by nature — README, LICENSE, and the
// entry-point docs are meant to belong to no cell — so root files are reported
// as unclaimed but never as gaps.
const likelyGaps = unclaimed
  .filter((file) => dirname(file) !== '.')
  .filter((file) => claimedDirectories.has(dirname(file)))
  .map((file) => ({
    path: file,
    claimed_sibling: claimedDirectories.get(dirname(file)),
    owner_only: isOwnerOnly(file),
    // Closing a gap means editing a CELL.json to widen its scope — never
    // editing the gapped file itself. So an owner-only path is still a gap a
    // contributor can close, as long as the mutation touches only the manifest.
    // `scripts/CELL.json` already scopes `protocol/cell.schema.json`, which is
    // owner-only, so the precedent is in the tree. Saying otherwise threw away
    // a third of the available first mutations.
    why: isOwnerOnly(file)
      ? 'No cell claims this file, but a file beside it is claimed. Close it by widening a CELL.json scope to include this path — do not put the file itself in your mutation, because the path is owner-only.'
      : 'No cell claims this file, but a file beside it is claimed. Either it belongs in that cell or it needs its own, and this is yours to fix.'
  }));

const output = {
  ...catalog,
  path_coverage: coverage.available
    ? { available: true, source: 'git ls-files', files_examined: tracked.length }
    : {
        available: false,
        source: 'git ls-files',
        reason: coverage.reason,
        consequence: 'This run did not examine any paths, so it cannot say whether any are unclaimed. The two fields below are null rather than empty: not looking and finding nothing are different answers.'
      },
  unclaimed_paths: coverage.available ? unclaimed : null,
  unclaimed_paths_note: 'Not every path belongs to a cell. Top-level documentation and repository metadata are expected here.',
  likely_catalog_gaps: coverage.available ? likelyGaps : null
};

if (catalog.errors.length > 0) {
  console.error(JSON.stringify(output, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(output, null, 2));
}

async function trackedFiles() {
  try {
    const { stdout } = await execFileAsync('git', ['ls-files'], { maxBuffer: 1024 * 1024 * 8 });
    return { available: true, files: stdout.split('\n').map((line) => line.trim()).filter(Boolean) };
  } catch (error) {
    // Where the catalog cannot enumerate the repository — the admission gate's
    // container has no git binary, and a tarball has no checkout — the cells
    // are still valid and still worth reporting. What it must not do is return
    // an empty list: a caller reading `likely_catalog_gaps: []` concludes the
    // catalog is complete, and that is a claim this run has no basis to make.
    return {
      available: false,
      files: [],
      reason: error.code === 'ENOENT'
        ? 'No git binary is available, so the tracked-file list could not be read.'
        : `git ls-files failed (${error.code ?? 'unknown error'}), so the tracked-file list could not be read.`
    };
  }
}
