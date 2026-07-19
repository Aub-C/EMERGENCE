import { appendFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { allChangedPaths, parseChangedFilesTsv } from './changed-files.mjs';
import { classifyMutation } from './risk-classifier.mjs';

const policy = JSON.parse(await readFile(process.argv[2], 'utf8'));
const files = allChangedPaths(parseChangedFilesTsv(await readFile(process.argv[3], 'utf8')));
const result = classifyMutation(files, policy);
console.log(JSON.stringify(result, null, 2));
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, [
    `risk=${result.level}`,
    `codex_required=${result.codexRequired}`,
    `auto_merge_allowed=${result.autoMergeAllowed}`
  ].join('\n') + '\n');
}
