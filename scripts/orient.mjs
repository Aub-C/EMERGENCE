import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { discoverCells, findCellForPath } from './lib/cells.mjs';
import { pathMatches } from '../control-plane/owner-authority.mjs';

const execFileAsync = promisify(execFile);
const args = parseArgs(process.argv.slice(2));
const catalog = await discoverCells();
if (catalog.errors.length > 0) throw new Error(`cell catalog is invalid:\n${catalog.errors.join('\n')}`);

let target = null;
if (args.cell) target = catalog.cells.find((cell) => cell.id === args.cell) ?? null;
if (!target && args.path) target = findCellForPath(catalog, args.path);
if (!target && catalog.cells.length === 1) target = catalog.cells[0];
if (!target) fail(explainNoTarget(catalog, args));

const dependencies = dependencyClosure(catalog, target.id);
const lawFiles = ['RULES.md', 'docs/OWNER_AUTHORITY.md'];
const lawFingerprints = {};
for (const path of lawFiles) {
  const content = await readFile(path);
  lawFingerprints[path] = `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

const projectManifest = JSON.parse(await readFile('docs/PROJECT_MANIFEST.json', 'utf8'));
const policy = JSON.parse(await readFile('control-plane/policy.json', 'utf8'));

// A cell's scope describes what the cell *is*, not what a contributor may
// change. `core.seed` legitimately covers package.json and Dockerfile, and both
// are owner-only. Offering the raw scope as "preferred" told agents to edit
// files that can never merge — so split it, and disclose the other half rather
// than hiding it.
const restrictedPatterns = [
  ...(policy.red_zone_paths ?? []),
  ...(policy.rule_authority?.owner_only_paths ?? [])
];
const isOwnerOnly = (path) => restrictedPatterns.some((pattern) => pathMatches(path, pattern));
const preferredScope = (target.scope ?? []).filter((path) => !isOwnerOnly(path));
const ownerOnlyScope = (target.scope ?? []).filter(isOwnerOnly);
const ledger = await readLedger('.emergence/ledger.ndjson', 12);
const recentCommits = await gitHistory(target.scope, 10);
const directDependents = catalog.dependents[target.id] ?? [];

const packet = {
  protocol_version: 1,
  generated_from: 'repository-working-tree',
  mandatory_law: {
    owner: projectManifest.authoritative?.rule_owner_github_login ?? 'Aub-C',
    files: lawFiles,
    fingerprints: lawFingerprints
  },
  mission: projectManifest.mission,
  target,
  dependencies,
  direct_dependents: directDependents,
  recent_commits: recentCommits,
  recent_ledger_events: ledger,
  read_plan: unique([
    ...lawFiles,
    'START_HERE.md',
    'AGENTS.md',
    target.manifest_path,
    ...target.read_first,
    ...dependencies.flatMap((cell) => [cell.manifest_path, ...cell.read_first]),
    ...target.decisions
  ]),
  mutation_guidance: {
    preferred_scope: preferredScope,
    owner_only_scope: ownerOnlyScope,
    owner_only_scope_note: ownerOnlyScope.length > 0
      ? `Owner-only. These belong to this cell, but only \`${projectManifest.authoritative?.rule_owner_github_login ?? 'Aub-C'}\` may change them. A mutation touching one fails closed however good the rest of it is. Raise a rule suggestion instead of editing them.`
      : 'Every path in this cell is yours to change.',
    validation: target.validation,
    extension_points: target.extension_points,
    security_disclosure: target.security,
    split_threshold: 'Create a new CELL.json when a capability can evolve, validate, or be replaced independently.'
  }
};

console.log(JSON.stringify(packet, null, 2));

function fail(message) {
  console.error(message);
  process.exit(1);
}

// Orientation is cell-scoped, and most top-level documentation belongs to no
// cell. The old message ("Specify --cell or --path") blamed the caller for an
// invocation that was correct, and did it through an uncaught stack trace — so
// an agent's first instinct was to debug its own command line.
function explainNoTarget(catalog, args) {
  const known = catalog.cells
    .map((cell) => `  ${cell.id}\n    covers: ${(cell.scope ?? []).join(', ') || '(nothing)'}`)
    .join('\n');

  if (args.path) {
    return [
      `orient: no cell claims "${args.path}".`,
      '',
      'Orientation is scoped to cells, and this path is inside none of them.',
      'That is not an error in your command, and it does not mean the file is',
      'off limits — top-level documentation usually belongs to no cell and is',
      'still yours to change. There is simply no bounded read plan to give you.',
      '',
      'Cells that do exist:',
      known,
      '',
      'To orient on one of those:   npm run orient -- --cell <id>',
      'To learn who may change this path:   npm run preflight'
    ].join('\n');
  }

  return [
    'orient: specify --cell <id> or --path <repo-relative-path>.',
    '',
    'Cells that exist:',
    known
  ].join('\n');
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === '--cell') parsed.cell = values[++index];
    else if (values[index] === '--path') parsed.path = values[++index];
    else throw new Error(`Unknown argument: ${values[index]}`);
  }
  return parsed;
}

function dependencyClosure(currentCatalog, rootId) {
  const byId = new Map(currentCatalog.cells.map((cell) => [cell.id, cell]));
  const output = [];
  const seen = new Set();
  function visit(id) {
    for (const dependency of byId.get(id)?.depends_on ?? []) {
      if (seen.has(dependency)) continue;
      seen.add(dependency);
      const cell = byId.get(dependency);
      if (cell) {
        output.push(cell);
        visit(dependency);
      }
    }
  }
  visit(rootId);
  return output;
}

async function readLedger(path, limit) {
  try {
    const lines = (await readFile(path, 'utf8')).trim().split('\n').filter(Boolean);
    return lines.slice(-limit).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function gitHistory(scope, limit) {
  try {
    const { stdout } = await execFileAsync('git', [
      'log', `-${limit}`, '--format=%H%x09%cs%x09%s', '--', ...scope
    ]);
    return stdout.trim().split('\n').filter(Boolean).map((line) => {
      const [sha, date, ...subject] = line.split('\t');
      return { sha, date, subject: subject.join('\t') };
    });
  } catch {
    return [];
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
