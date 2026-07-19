import test from 'node:test';
import assert from 'node:assert/strict';
import { allChangedPaths, parseChangedFilesTsv } from '../changed-files.mjs';

test('plain path lines parse as modified entries', () => {
  const entries = parseChangedFilesTsv('docs/a.md\nsrc/b.mjs\n');
  assert.deepEqual(entries, [
    { path: 'docs/a.md', status: 'modified', previousPath: null },
    { path: 'src/b.mjs', status: 'modified', previousPath: null }
  ]);
});

test('rename rows keep the previous path', () => {
  const entries = parseChangedFilesTsv('docs/relocated.json\trenamed\tcontrol-plane/policy.json\n');
  assert.deepEqual(entries, [
    { path: 'docs/relocated.json', status: 'modified', previousPath: 'control-plane/policy.json' }
  ]);
  assert.deepEqual(allChangedPaths(entries), ['docs/relocated.json', 'control-plane/policy.json']);
});

test('empty previous column parses as no previous path', () => {
  const entries = parseChangedFilesTsv('docs/a.md\tmodified\t\n');
  assert.deepEqual(entries, [{ path: 'docs/a.md', status: 'modified', previousPath: null }]);
});

test('added and removed statuses normalize from api and git shorthand', () => {
  const entries = parseChangedFilesTsv('gone.md\tD\nnew.md\tadded\n');
  assert.equal(entries[0].status, 'removed');
  assert.equal(entries[1].status, 'added');
});

test('all changed paths deduplicate across columns', () => {
  const entries = parseChangedFilesTsv('a.md\tmodified\nb.md\trenamed\ta.md\n');
  assert.deepEqual(allChangedPaths(entries), ['a.md', 'b.md']);
});
