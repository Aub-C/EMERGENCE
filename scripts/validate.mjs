import { access, readFile } from 'node:fs/promises';
import { discoverCells } from './lib/cells.mjs';

const required = [
  '.emergence/organism.json',
  '.emergence/candidate.json',
  'RULES.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'package.json',
  'CELL.json',
  'protocol/cell.schema.json',
  'docs/SCALING_ARCHITECTURE.md',
  'docs/ADMISSION_GATE.md',
  'control-plane/CELL.json',
  'src/server.mjs'
];

for (const file of required) await access(file);

const organism = JSON.parse(await readFile('.emergence/organism.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const candidate = JSON.parse(await readFile('.emergence/candidate.json', 'utf8'));

const catalog = await discoverCells();
if (catalog.errors.length > 0) {
  throw new Error(`cell catalog invalid:
${catalog.errors.join('\n')}`);
}
if (catalog.cell_count === 0) throw new Error('at least one CELL.json is required');

for (const key of ['read_rules', 'github_policy_compliant', 'beneficial_use', 'accurate_disclosure']) {
  if (candidate.attestations?.[key] !== true) throw new Error(`candidate.attestations.${key} must be true`);
}

for (const key of ['verify', 'start']) {
  if (!Array.isArray(organism[key]) || organism[key].length === 0 || organism[key].some((part) => typeof part !== 'string')) {
    throw new Error(`organism.${key} must be a non-empty string array`);
  }
}

if (!organism.health?.path?.startsWith('/')) {
  throw new Error('organism.health.path must start with /');
}

if (!pkg.scripts?.test) throw new Error('package.json must expose a test command for the seed runtime');

console.log(JSON.stringify({ valid: true, identity: organism.identity, protocol: organism.protocol_version, cells: catalog.cell_count }));
