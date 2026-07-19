import { extname } from 'node:path';
import { pathMatches } from './owner-authority.mjs';

const EXECUTABLE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.py', '.rb', '.php', '.pl',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd', '.go', '.rs', '.java',
  '.kt', '.kts', '.c', '.cc', '.cpp', '.cxx', '.h', '.hpp', '.cs', '.swift', '.lua'
]);

// Recognised static assets and inert data. `.svg` is scriptable, so it is only
// safe to call low risk because security-scan.mjs hard-fails markup carrying
// active content. Keep the two in step: never add a scriptable format here
// without a matching content rule there. `.html` is deliberately absent —
// scripting is its purpose, so it stays unclassified and earns adversarial
// review. Dependency manifests and owner-only paths are classified before this
// set is consulted, so a `.json` lock file or policy file is unaffected.
const LOW_RISK_EXTENSIONS = new Set([
  '.md', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
  '.svg', '.json', '.jsonl', '.ndjson', '.csv', '.sha256', '.sha512'
]);

export function classifyMutation(changedFiles, policy) {
  const files = [...new Set((changedFiles ?? []).map(normalize).filter(Boolean))];
  const ownerOnly = policy.rule_authority?.owner_only_paths ?? [];
  const redZone = policy.red_zone_paths ?? [];
  const reasons = [];

  const ownerOnlyFiles = matchAny(files, ownerOnly);
  const redZoneFiles = matchAny(files, redZone);
  if (ownerOnlyFiles.length > 0) reasons.push(`owner-only paths: ${ownerOnlyFiles.join(', ')}`);
  if (redZoneFiles.length > 0) reasons.push(`red-zone paths: ${redZoneFiles.join(', ')}`);

  const executableFiles = files.filter((file) => EXECUTABLE_EXTENSIONS.has(extname(file).toLowerCase()));
  const dependencyFiles = files.filter((file) => /(^|\/)(package(-lock)?\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|requirements.*\.txt|poetry\.lock|pyproject\.toml|go\.(mod|sum)|cargo\.(toml|lock)|pom\.xml|build\.gradle(?:\.kts)?)$/i.test(file));
  const workflowFiles = files.filter((file) => file.startsWith('.github/workflows/'));
  const unknownFiles = files.filter((file) => {
    const extension = extname(file).toLowerCase();
    return extension && !LOW_RISK_EXTENSIONS.has(extension) && !EXECUTABLE_EXTENSIONS.has(extension) && !dependencyFiles.includes(file);
  });

  if (workflowFiles.length > 0) reasons.push(`workflow changes: ${workflowFiles.join(', ')}`);
  if (dependencyFiles.length > 0) reasons.push(`dependency changes: ${dependencyFiles.join(', ')}`);
  if (executableFiles.length > 0) reasons.push(`executable source: ${executableFiles.join(', ')}`);
  if (unknownFiles.length > 0) reasons.push(`unclassified file types: ${unknownFiles.join(', ')}`);

  let level = 'low';
  if (ownerOnlyFiles.length > 0 || redZoneFiles.length > 0 || workflowFiles.length > 0) level = 'critical';
  else if (dependencyFiles.length > 0 || executableFiles.length > 0 || unknownFiles.length > 0) level = 'high';

  return {
    level,
    codexRequired: (policy.adversarial_review?.required_risk_levels ?? ['high', 'critical']).includes(level),
    autoMergeAllowed: level !== 'critical',
    files,
    ownerOnlyFiles,
    redZoneFiles,
    executableFiles,
    dependencyFiles,
    workflowFiles,
    unknownFiles,
    reasons
  };
}

function matchAny(files, patterns) {
  return files.filter((file) => patterns.some((pattern) => pathMatches(file, pattern)));
}

function normalize(path) {
  return String(path ?? '').replace(/^\.\//, '').replace(/\\/g, '/').trim();
}
