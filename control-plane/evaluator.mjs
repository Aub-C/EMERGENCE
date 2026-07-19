import { spawn } from 'node:child_process';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { changedFilesFromEnvironment, evaluateOwnerAuthority } from './owner-authority.mjs';

const candidateRoot = resolve(process.argv[2] ?? '.');
const controlRoot = new URL('.', import.meta.url);
const policy = JSON.parse(await readFile(new URL('./policy.json', controlRoot), 'utf8'));
const organism = JSON.parse(await readFile(join(candidateRoot, '.emergence/organism.json'), 'utf8'));
const provenance = JSON.parse(await readFile(join(candidateRoot, '.emergence/candidate.json'), 'utf8'));
const denylist = JSON.parse(await readFile(new URL('./denylist.json', controlRoot), 'utf8'));
const findings = [];

await verifyRequiredFiles();
await verifyPolicyMirror();
await verifyOwnerAuthority();
verifyAttestations();
verifyDenylist();
await scanRepository(candidateRoot);
if (findings.some((item) => item.level === 'hard-fail')) finish(false);

if (organism.install) await run(organism.install, 'install');
await run(organism.verify, 'verify');
await verifyRuntime();
finish(true);

async function verifyRequiredFiles() {
  for (const relativePath of policy.required_files ?? []) {
    try {
      await access(join(candidateRoot, relativePath));
      findings.push({ level: 'pass', phase: 'policy', file: relativePath, message: 'required file present' });
    } catch {
      findings.push({ level: 'hard-fail', phase: 'policy', file: relativePath, message: 'required file missing' });
    }
  }
}

async function verifyPolicyMirror() {
  const mirror = policy.policy_mirror;
  if (!mirror?.path || !mirror?.sha256) {
    findings.push({ level: 'hard-fail', phase: 'policy', message: 'observer policy mirror is not configured' });
    return;
  }

  try {
    const content = await readFile(join(candidateRoot, mirror.path));
    const digest = createHash('sha256').update(content).digest('hex');
    findings.push({
      level: digest === mirror.sha256 ? 'pass' : 'hard-fail',
      phase: 'policy',
      file: mirror.path,
      message: digest === mirror.sha256 ? 'protected policy mirror matches observer' : 'protected policy mirror changed',
      expected_sha256: mirror.sha256,
      actual_sha256: digest
    });
  } catch (error) {
    findings.push({ level: 'hard-fail', phase: 'policy', file: mirror.path, message: `policy mirror unavailable: ${error.message}` });
  }
}

async function verifyOwnerAuthority() {
  const changedFiles = await changedFilesFromEnvironment({ cwd: candidateRoot });
  const result = evaluateOwnerAuthority({
    changedFiles,
    actor: process.env.EMERGENCE_ACTOR,
    author: process.env.EMERGENCE_PR_AUTHOR ?? process.env.EMERGENCE_ACTOR,
    authority: policy.rule_authority
  });

  findings.push({
    level: result.accepted ? 'pass' : 'hard-fail',
    phase: 'policy',
    message: result.reason,
    owner_only_changes: result.protectedChanges
  });
}

function verifyAttestations() {
  const required = ['read_rules', 'github_policy_compliant', 'beneficial_use', 'accurate_disclosure'];
  for (const key of required) {
    findings.push({
      level: provenance.attestations?.[key] === true ? 'pass' : 'hard-fail',
      phase: 'policy',
      message: `candidate attestation ${key}`
    });
  }
}

function verifyDenylist() {
  const declared = new Set([
    process.env.EMERGENCE_ACTOR,
    process.env.EMERGENCE_AUTOMATION_ID,
    provenance.agent?.name,
    provenance.agent?.model,
    provenance.agent?.operator,
    provenance.agent?.github_actor,
    provenance.agent?.automation_id
  ].filter(Boolean).map((value) => String(value).trim().toLowerCase()));

  for (const entry of denylist.entries ?? []) {
    const identifiers = Array.isArray(entry.identifiers) ? entry.identifiers : [];
    const match = identifiers
      .map((value) => String(value).trim().toLowerCase())
      .find((value) => declared.has(value));
    if (match) {
      findings.push({ level: 'hard-fail', phase: 'policy', message: 'candidate identity is denied', denylist_entry: entry.id ?? 'unidentified' });
      return;
    }
  }

  findings.push({ level: 'pass', phase: 'policy', message: 'no declared candidate identity matched the denylist' });
}

async function run(command, phase, env = {}) {
  if (!Array.isArray(command) || command.length === 0) {
    findings.push({ level: 'hard-fail', phase, message: 'invalid command contract' });
    finish(false);
  }

  const [program, ...args] = command;
  const child = spawn(program, args, {
    cwd: candidateRoot,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, CI: 'true', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });

  const timeout = setTimeout(() => child.kill('SIGKILL'), policy.limits.command_timeout_ms);
  const [code, signal] = await once(child, 'exit');
  clearTimeout(timeout);

  findings.push({
    level: code === 0 ? 'pass' : 'hard-fail',
    phase,
    code,
    signal,
    stdout: stdout.slice(-8000),
    stderr: stderr.slice(-8000)
  });

  if (code !== 0) finish(false);
}

async function verifyRuntime() {
  const port = 39000 + Math.floor(Math.random() * 1000);
  const [program, ...args] = organism.start;
  const child = spawn(program, args, {
    cwd: candidateRoot,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      CI: 'true',
      [organism.runtime.port_env]: String(port)
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });

  const timeoutMs = Math.min(
    organism.health.startup_timeout_ms,
    policy.limits.startup_timeout_ms_max
  );
  const deadline = Date.now() + timeoutMs;
  let passed = false;

  try {
    while (Date.now() < deadline) {
      if (child.exitCode !== null) break;
      try {
        const response = await fetch(`http://127.0.0.1:${port}${organism.health.path}`);
        if (response.status === organism.health.expected_status) {
          passed = true;
          break;
        }
      } catch {}
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
  } finally {
    child.kill('SIGTERM');
  }

  findings.push({
    level: passed ? 'pass' : 'hard-fail',
    phase: 'runtime',
    message: passed ? 'health contract satisfied' : 'health contract failed'
  });

  if (!passed) finish(false);
}

async function scanRepository(root) {
  let totalBytes = 0;
  for (const file of await walk(root)) {
    const info = await stat(file);
    totalBytes += info.size;

    if (info.size > policy.limits.max_single_file_bytes) {
      findings.push({ level: 'hard-fail', phase: 'scan', file, message: 'single file limit exceeded' });
      continue;
    }

    if (info.size <= 1_000_000) {
      const content = await readFile(file, 'utf8').catch(() => null);
      if (content !== null) {
        for (const pattern of policy.blocked_patterns) {
          if (new RegExp(pattern).test(content)) {
            findings.push({ level: 'hard-fail', phase: 'scan', file, message: `blocked secret pattern: ${pattern}` });
          }
        }
      }
    }
  }

  if (totalBytes > policy.limits.max_repository_bytes) {
    findings.push({ level: 'hard-fail', phase: 'scan', message: 'repository size limit exceeded', totalBytes });
  } else {
    findings.push({ level: 'pass', phase: 'scan', totalBytes });
  }
}

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'coverage', 'dist', 'control-plane'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path));
    else output.push(path);
  }
  return output;
}

function finish(accepted) {
  console.log(JSON.stringify({ accepted, identity: organism.identity, findings }, null, 2));
  process.exit(accepted ? 0 : 1);
}
