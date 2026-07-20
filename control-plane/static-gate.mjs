import { lstat, readFile } from 'node:fs/promises';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { allChangedPaths, parseChangedFilesTsv } from './changed-files.mjs';
import { detectEvasion } from './evasion.mjs';
import { evaluateOwnerAuthority } from './owner-authority.mjs';
import { evaluatePullRequestAttestation } from './pr-attestation.mjs';
import { classifyMutation } from './risk-classifier.mjs';
import { scanChangedFiles } from './security-scan.mjs';
import { checkAttribution } from './attribution-policy.mjs';

const candidateRoot = resolve(process.argv[2] ?? '.');
const eventPath = process.argv[3] ?? process.env.GITHUB_EVENT_PATH;
const changedFilePath = process.argv[4] ?? process.env.EMERGENCE_CHANGED_FILES_FILE;
const controlRoot = new URL('.', import.meta.url);
const policy = JSON.parse(await readFile(new URL('./policy.json', controlRoot), 'utf8'));
const denylist = JSON.parse(await readFile(new URL('./denylist.json', controlRoot), 'utf8'));
const event = eventPath ? JSON.parse(await readFile(eventPath, 'utf8')) : {};
const changedEntries = changedFilePath
  ? parseChangedFilesTsv(await readFile(changedFilePath, 'utf8'))
  : [];
// Classification and owner-authority checks must see rename sources too, or a
// rename out of a protected path escapes red-zone matching.
const changedFiles = allChangedPaths(changedEntries);
const actor = event.sender?.login ?? process.env.EMERGENCE_ACTOR;
const author = event.pull_request?.user?.login ?? process.env.EMERGENCE_PR_AUTHOR ?? actor;
const findings = [];
let candidateProvenance = {};

await verifyRequiredFiles();
await verifyPolicyMirror();
await verifyCandidateProvenance();
verifyPullRequestBody();
verifyIdentity();
const risk = classifyMutation(changedFiles, policy);
verifyOwnerAuthority(risk);
const scan = await scanChangedFiles({ root: candidateRoot, changedEntries, policy });
findings.push(...scan.findings);
const attribution = await checkAttribution({ root: candidateRoot, changedFiles, policy });
findings.push(...attribution.findings);

const ownerLogin = normalizeIdentity(policy.rule_authority?.sole_authority_github_login ?? '');
const isOwner = ownerLogin !== '' && normalizeIdentity(author) === ownerLogin && normalizeIdentity(actor) === ownerLogin;
const evasion = detectEvasion({ findings, risk, isOwner });

const accepted = findings.every((finding) => finding.level !== 'hard-fail');
const result = { accepted, actor, author, risk, evasion, findings };
console.log(JSON.stringify(result, null, 2));
writeOutputs(result);
process.exit(accepted ? 0 : 1);


async function verifyRequiredFiles() {
  for (const relative of policy.required_files ?? []) {
    try {
      const info = await lstat(resolve(candidateRoot, relative));
      const accepted = info.isFile() && !info.isSymbolicLink();
      findings.push({
        level: accepted ? 'pass' : 'hard-fail',
        phase: 'policy',
        rule: 'required-file-missing',
        file: relative,
        message: accepted ? 'required file present as a regular file' : 'required path is not a regular file'
      });
    } catch (error) {
      findings.push({ level: 'hard-fail', phase: 'policy', rule: 'required-file-missing', file: relative, message: `required file unavailable: ${error.message}` });
    }
  }
}

async function verifyPolicyMirror() {
  try {
    const mirrorPath = resolve(candidateRoot, policy.policy_mirror.path);
    const mirrorInfo = await lstat(mirrorPath);
    if (!mirrorInfo.isFile() || mirrorInfo.isSymbolicLink()) throw new Error('policy mirror must be a regular file');
    const content = await readFile(mirrorPath);
    const digest = createHash('sha256').update(content).digest('hex');
    findings.push({
      level: digest === policy.policy_mirror.sha256 ? 'pass' : 'hard-fail',
      phase: 'policy',
      rule: 'policy-mirror-changed',
      file: policy.policy_mirror.path,
      message: digest === policy.policy_mirror.sha256 ? 'project-law mirror matches trusted observer' : 'project-law mirror changed'
    });
  } catch (error) {
    findings.push({ level: 'hard-fail', phase: 'policy', rule: 'policy-mirror-changed', file: policy.policy_mirror.path, message: error.message });
  }
}

async function verifyCandidateProvenance() {
  try {
    const provenancePath = resolve(candidateRoot, '.emergence/candidate.json');
    const provenanceInfo = await lstat(provenancePath);
    if (!provenanceInfo.isFile() || provenanceInfo.isSymbolicLink()) throw new Error('candidate provenance must be a regular file');
    const candidate = JSON.parse(await readFile(provenancePath, 'utf8'));
    if (!candidate.agent?.name || !candidate.intent) throw new Error('candidate provenance requires agent.name and intent');
    if (candidate.agent?.github_actor && normalizeIdentity(candidate.agent.github_actor) !== normalizeIdentity(author)) {
      findings.push({ level: 'hard-fail', phase: 'policy', rule: 'provenance-actor-mismatch', message: 'declared github_actor does not match pull request author' });
    }
    for (const key of ['read_rules', 'github_policy_compliant', 'beneficial_use', 'accurate_disclosure']) {
      findings.push({
        level: candidate.attestations?.[key] === true ? 'pass' : 'hard-fail',
        phase: 'policy',
        rule: 'candidate-attestation',
        message: `candidate attestation ${key}`
      });
    }
    candidateProvenance = candidate;
  } catch (error) {
    findings.push({ level: 'hard-fail', phase: 'policy', rule: 'candidate-provenance-invalid', file: '.emergence/candidate.json', message: `invalid candidate provenance: ${error.message}` });
    candidateProvenance = {};
  }
}

function verifyPullRequestBody() {
  if (!event.pull_request) return;
  const result = evaluatePullRequestAttestation(event.pull_request.body);
  findings.push({
    level: result.accepted ? 'pass' : 'hard-fail',
    phase: 'policy',
    rule: 'pull-request-attestation',
    message: result.accepted ? 'pull request disclosure and attestations complete' : 'pull request disclosure or attestations incomplete',
    missing: result.missing,
    missing_sections: result.missingSections
  });
}

function verifyIdentity() {
  const candidate = candidateProvenance;
  const declared = new Set([
    actor,
    author,
    candidate.agent?.name,
    candidate.agent?.model,
    candidate.agent?.operator,
    candidate.agent?.github_actor,
    candidate.agent?.automation_id
  ].filter(Boolean).map(normalizeIdentity));

  const denied = (denylist.entries ?? []).find((entry) => (entry.identifiers ?? []).map(normalizeIdentity).some((identifier) => declared.has(identifier)));
  findings.push({
    level: denied ? 'hard-fail' : 'pass',
    phase: 'policy',
    rule: 'identity-denied',
    message: denied ? 'candidate or operator identity is denied' : 'no declared identity matched the denylist',
    denylist_entry: denied?.id
  });
}

function verifyOwnerAuthority(risk) {
  const protectedPaths = [...new Set([
    ...(policy.rule_authority?.owner_only_paths ?? []),
    ...(policy.red_zone_paths ?? [])
  ])];
  const result = evaluateOwnerAuthority({
    changedFiles,
    actor,
    author,
    authority: policy.rule_authority,
    protectedPaths
  });
  findings.push({
    level: result.accepted ? 'pass' : 'hard-fail',
    phase: 'policy',
    rule: 'owner-only-path',
    message: result.reason,
    protected_changes: result.protectedChanges,
    risk_level: risk.level
  });
}

function writeOutputs(result) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) return;
  const lines = [
    `risk=${result.risk.level}`,
    `codex_required=${result.risk.codexRequired}`,
    `auto_merge_allowed=${result.risk.autoMergeAllowed}`,
    `accepted=${result.accepted}`,
    `evasion_detected=${result.evasion?.detected === true}`,
    `ban_eligible=${result.evasion?.ban_eligible === true}`
  ];
  appendFileSync(output, `${lines.join('\n')}\n`);
}

function normalizeIdentity(value) {
  return String(value).trim().toLowerCase();
}
