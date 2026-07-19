import { readFile } from 'node:fs/promises';
import { allChangedPaths, parseChangedFilesTsv } from './changed-files.mjs';
import { classifyMutation } from './risk-classifier.mjs';
import { evaluateAdversarialReview } from './codex-review-gate.mjs';

const policy = JSON.parse(await readFile(process.argv[2], 'utf8'));
const changedFiles = allChangedPaths(parseChangedFilesTsv(await readFile(process.argv[3], 'utf8')));
const reviews = JSON.parse(await readFile(process.argv[4], 'utf8'));
const labels = JSON.parse(await readFile(process.argv[5], 'utf8'));
const labelEvents = JSON.parse(await readFile(process.argv[6], 'utf8'));
const headSha = process.env.EMERGENCE_HEAD_SHA ?? '';
const risk = classifyMutation(changedFiles, policy);
const result = evaluateAdversarialReview({ risk, reviews, labels, labelEvents, policy, headSha });
console.log(JSON.stringify({ risk, ...result }, null, 2));
process.exit(result.accepted ? 0 : 1);
