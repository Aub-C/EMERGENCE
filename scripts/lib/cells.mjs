import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

const ignoredDirectories = new Set(['.git', 'node_modules', 'coverage', 'dist', 'build', '.cache']);
const idPattern = /^[a-z0-9][a-z0-9._-]*$/;

export async function discoverCells(root = process.cwd()) {
  const rootPath = resolve(root);
  const manifests = [];
  await walk(rootPath, rootPath, manifests);

  const cells = [];
  const errors = [];
  const ids = new Map();

  for (const manifestPath of manifests.sort()) {
    const repoPath = toRepoPath(relative(rootPath, manifestPath));
    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      validateManifest(manifest, repoPath, errors);

      if (ids.has(manifest.id)) {
        errors.push(`duplicate cell id ${manifest.id}: ${ids.get(manifest.id)} and ${repoPath}`);
      } else {
        ids.set(manifest.id, repoPath);
      }

      cells.push({
        id: manifest.id,
        name: manifest.name,
        status: manifest.status,
        purpose: manifest.purpose,
        manifest_path: repoPath,
        scope: manifest.scope,
        entrypoints: manifest.entrypoints,
        interfaces: manifest.interfaces,
        depends_on: manifest.depends_on,
        capabilities: manifest.capabilities,
        read_first: manifest.read_first,
        validation: manifest.validation,
        security: manifest.security,
        extension_points: manifest.extension_points,
        decisions: manifest.decisions,
        replaced_by: manifest.replaced_by ?? null,
        metadata: manifest.metadata ?? {}
      });
    } catch (error) {
      errors.push(`${repoPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const claimedScopes = [];
  for (const cell of cells) {
    for (const rawScope of cell.scope ?? []) {
      const scope = rawScope.replace(/^\.\//, '').replace(/\/$/, '');
      for (const claimed of claimedScopes) {
        if (claimed.cell_id === cell.id) continue;
        const overlaps = scope === claimed.scope || scope.startsWith(`${claimed.scope}/`) || claimed.scope.startsWith(`${scope}/`);
        if (overlaps) errors.push(`overlapping cell scope: ${cell.id}:${scope} and ${claimed.cell_id}:${claimed.scope}`);
      }
      claimedScopes.push({ cell_id: cell.id, scope });
    }
  }

  const cellIds = new Set(cells.map((cell) => cell.id));
  for (const cell of cells) {
    for (const dependency of cell.depends_on ?? []) {
      if (!cellIds.has(dependency)) errors.push(`${cell.manifest_path}: missing dependency ${dependency}`);
      if (dependency === cell.id) errors.push(`${cell.manifest_path}: cell cannot depend on itself`);
    }
  }

  const dependents = Object.fromEntries(cells.map((cell) => [cell.id, []]));
  for (const cell of cells) {
    for (const dependency of cell.depends_on ?? []) {
      if (dependents[dependency]) dependents[dependency].push(cell.id);
    }
  }
  for (const values of Object.values(dependents)) values.sort();

  return {
    protocol_version: 1,
    cell_count: cells.length,
    cells: cells.sort((a, b) => a.id.localeCompare(b.id)),
    dependents,
    dependency_cycles: findCycles(cells),
    errors
  };
}

export function findCellForPath(catalog, candidatePath) {
  const normalized = toRepoPath(candidatePath).replace(/^\.\//, '');
  const matches = catalog.cells
    .flatMap((cell) => cell.scope.map((scope) => ({ cell, scope: scope.replace(/\/$/, '') })))
    .filter(({ scope }) => normalized === scope || normalized.startsWith(`${scope}/`))
    .sort((a, b) => b.scope.length - a.scope.length);
  return matches[0]?.cell ?? null;
}

async function walk(rootPath, directory, manifests) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(rootPath, fullPath, manifests);
    else if (entry.isFile() && entry.name === 'CELL.json') manifests.push(fullPath);
  }
}

function validateManifest(manifest, path, errors) {
  for (const field of [
    'protocol_version', 'id', 'name', 'status', 'purpose', 'scope', 'entrypoints',
    'interfaces', 'depends_on', 'capabilities', 'read_first', 'validation',
    'security', 'extension_points', 'decisions'
  ]) {
    if (!(field in manifest)) errors.push(`${path}: missing ${field}`);
  }

  if (!idPattern.test(manifest.id ?? '')) errors.push(`${path}: invalid id ${JSON.stringify(manifest.id)}`);
  for (const field of ['scope', 'entrypoints', 'interfaces', 'depends_on', 'capabilities', 'read_first', 'validation', 'extension_points', 'decisions']) {
    if (!Array.isArray(manifest[field])) errors.push(`${path}: ${field} must be an array`);
  }
  if (!manifest.security || typeof manifest.security !== 'object' || Array.isArray(manifest.security)) {
    errors.push(`${path}: security must be an object`);
  }
}

function findCycles(cells) {
  const graph = new Map(cells.map((cell) => [cell.id, cell.depends_on ?? []]));
  const visited = new Set();
  const active = new Set();
  const stack = [];
  const cycles = [];
  const seen = new Set();

  function visit(id) {
    if (active.has(id)) {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id];
      const key = cycle.join('>');
      if (!seen.has(key)) {
        seen.add(key);
        cycles.push(cycle);
      }
      return;
    }
    if (visited.has(id)) return;
    visited.add(id);
    active.add(id);
    stack.push(id);
    for (const dependency of graph.get(id) ?? []) if (graph.has(dependency)) visit(dependency);
    stack.pop();
    active.delete(id);
  }

  for (const id of graph.keys()) visit(id);
  return cycles;
}

function toRepoPath(path) {
  return path.split(sep).join('/');
}
