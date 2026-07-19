import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ignored = new Set(['.git', 'node_modules', 'coverage', 'dist']);
const files = await walk('.');
let sourceLines = 0;
let documentationLines = 0;
let testFiles = 0;

for (const file of files) {
  const extension = extname(file);
  if (['.js', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.rs', '.go'].includes(extension)) {
    sourceLines += countLines(await readFile(file, 'utf8'));
  }
  if (extension === '.md') documentationLines += countLines(await readFile(file, 'utf8'));
  if (file.includes('/test/') || /\.test\.[^.]+$/.test(file)) testFiles += 1;
}

const report = {
  protocol_version: 1,
  measured_at: new Date().toISOString(),
  files: files.length,
  source_lines: sourceLines,
  documentation_lines: documentationLines,
  test_files: testFiles,
  score: Math.min(100, 40 + Math.min(testFiles * 8, 24) + Math.min(documentationLines / 20, 18) + Math.min(sourceLines / 100, 18)),
  note: 'Seed score is observational and does not gate merging.'
};

console.log(JSON.stringify(report, null, 2));

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else if ((await stat(path)).size < 1_000_000) result.push(path);
  }
  return result;
}

function countLines(text) {
  return text === '' ? 0 : text.split('\n').length;
}
