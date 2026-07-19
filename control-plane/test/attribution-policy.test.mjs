import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkAttribution } from '../attribution-policy.mjs';

const policy = {
  attribution_policy: {
    forbidden_patterns: ['\\bgpt\\b', '\\bopenai\\b', '\\bchatgpt\\b', '\\banthropic\\b', '\\bclaude\\b'],
    provenance_paths: ['.emergence/**', '**/PROVENANCE.md', '**/provenance.json'],
    metadata_scoped_extensions: ['.svg']
  }
};

async function check(files, options = {}) {
  const root = await mkdtemp(join(tmpdir(), 'emergence-attr-'));
  for (const [name, content] of Object.entries(files)) {
    const path = join(root, name);
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, content);
  }
  return checkAttribution({
    root,
    changedFiles: Object.keys(files),
    policy: { ...policy, ...options.policy }
  });
}

test('vendor attribution on a rendered page is rejected', async () => {
  const r = await check({ 'README.md': 'Created by GPT-5.6 Thinking (OpenAI).\n' });
  assert.equal(r.accepted, false);
  assert.ok(r.findings.some((f) => f.rule === 'vendor-attribution' && f.file === 'README.md'));
});

test('vendor attribution inside a provenance record is permitted', async () => {
  const r = await check({ 'assets/brand/PROVENANCE.md': '**Created by:** GPT-5.6 Thinking (OpenAI)\n' });
  assert.equal(r.accepted, true);
  assert.deepEqual(r.findings.filter((f) => f.level === 'hard-fail'), []);
});

test('machine provenance under .emergence is permitted', async () => {
  const r = await check({ '.emergence/candidate.json': '{"model":"GPT-5.6 Thinking"}\n' });
  assert.equal(r.accepted, true);
});

test('vendor attribution inside svg metadata is permitted', async () => {
  const r = await check({
    'assets/brand/logo.svg':
      '<svg xmlns="http://www.w3.org/2000/svg"><metadata>creator="GPT-5.6 Thinking" provider="OpenAI"</metadata>' +
      '<circle r="4"/></svg>\n'
  });
  assert.equal(r.accepted, true);
});

test('vendor attribution in visible svg content is rejected', async () => {
  const r = await check({
    'assets/brand/logo.svg':
      '<svg xmlns="http://www.w3.org/2000/svg"><metadata>id="seed.001"</metadata>' +
      '<text>Made by OpenAI</text></svg>\n'
  });
  assert.equal(r.accepted, false);
  assert.ok(r.findings.some((f) => f.rule === 'vendor-attribution'));
});

test('the project’s own adversarial-review vocabulary is not treated as a vendor name', async () => {
  const r = await check({
    'docs/GATE.md': 'The codex-review gate requires evidence; codexRequired is set by risk-cli.\n'
  });
  assert.equal(r.accepted, true);
});

test('clean documentation passes', async () => {
  const r = await check({ 'docs/BRAND_GUIDE.md': 'Created autonomously as mutation visual.identity.seed.001.\n' });
  assert.equal(r.accepted, true);
  assert.deepEqual(r.findings.filter((f) => f.level === 'hard-fail'), []);
});

test('an unreadable or binary changed path does not crash the check', async () => {
  const r = await check({ 'assets/icon.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]) });
  assert.equal(r.accepted, true);
});

test('a missing configuration disables the check rather than failing open silently', async () => {
  const r = await check({ 'README.md': 'Created by GPT-5.6 Thinking.\n' }, { policy: { attribution_policy: undefined } });
  assert.equal(r.accepted, true);
  assert.ok(r.findings.some((f) => f.level === 'warning' && f.rule === 'attribution-policy-unconfigured'));
});

test('scanner definitions are exempt, as they necessarily contain what they detect', async () => {
  const r = await check(
    { 'control-plane/policy.json': '{"forbidden":["openai","chatgpt"]}\n' },
    { policy: { static_scan: { signature_definition_paths: ['control-plane/**'] } } }
  );
  assert.equal(r.accepted, true);
});
