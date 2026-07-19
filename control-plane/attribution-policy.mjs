import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { pathMatches } from './owner-authority.mjs';

// Project law keeps vendor and model names off rendered pages while still
// requiring honest provenance. Those two requirements are not in conflict: the
// same fact belongs in the provenance record, not on the front page.
//
// Presentation surfaces are everything not explicitly listed as a provenance
// path — default-deny, so a new rendered page is covered the day it is added
// rather than the day someone remembers to allowlist it.
//
// `.svg` is scanned with its <metadata> elements removed, so an asset may carry
// embedded provenance while its visible artwork may not.
export async function checkAttribution({ root, changedFiles, policy, readTextFile }) {
  const config = policy?.attribution_policy;
  const findings = [];

  if (!config || !Array.isArray(config.forbidden_patterns) || config.forbidden_patterns.length === 0) {
    findings.push({
      level: 'warning',
      phase: 'attribution',
      file: null,
      rule: 'attribution-policy-unconfigured',
      message: 'no attribution policy is configured; vendor attribution is not being enforced'
    });
    return { accepted: true, findings };
  }

  const patterns = config.forbidden_patterns.map((source) => new RegExp(source, 'i'));
  const provenancePaths = config.provenance_paths ?? [];
  const metadataScoped = new Set(config.metadata_scoped_extensions ?? []);
  const read = readTextFile ?? ((absolute) => readFile(absolute, 'utf8'));

  // The scanner's own definitions necessarily contain the strings they detect,
  // exactly as security-scan.mjs treats them. Owner-only red-zone paths, so
  // exempting them costs nothing and prevents the rule from rejecting itself.
  const signaturePaths = policy?.static_scan?.signature_definition_paths ?? [];

  for (const relative of [...new Set(changedFiles ?? [])].filter(Boolean)) {
    if (signaturePaths.some((pattern) => pathMatches(relative, pattern))) continue;
    if (provenancePaths.some((pattern) => matchesProvenancePath(relative, pattern))) continue;

    let content;
    try {
      content = await read(resolve(root, relative));
    } catch {
      continue; // absent or unreadable paths are the static scanner's concern, not this one
    }
    if (content.includes('\u0000')) continue; // binary asset; nothing readable to judge

    const scanned = metadataScoped.has(extname(relative).toLowerCase())
      ? content.replace(/<metadata\b[\s\S]*?<\/metadata>/gi, ' ')
      : content;

    const matched = patterns.find((pattern) => pattern.test(scanned));
    if (matched) {
      findings.push({
        level: 'hard-fail',
        phase: 'attribution',
        file: relative,
        rule: 'vendor-attribution',
        message: 'rendered surface names an AI vendor or model; record the authoring agent in a provenance file instead'
      });
    }
  }

  return { accepted: findings.every((finding) => finding.level !== 'hard-fail'), findings };
}

// Deliberately local rather than an extension of pathMatches(): that matcher
// decides red-zone and owner-only protection, and loosening its semantics to
// suit this feature could silently widen or narrow those boundaries. This one
// adds only what the attribution allowlist needs — a trailing-basename form —
// and delegates everything else unchanged.
function matchesProvenancePath(relative, pattern) {
  const normalized = String(pattern).replace(/^\.\//, '');
  if (normalized.startsWith('**/')) {
    const basename = normalized.slice(3);
    return !basename.includes('/') && String(relative).split('/').pop() === basename;
  }
  return pathMatches(relative, normalized);
}
