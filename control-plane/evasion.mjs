// Recognized gate-bypass attempts, named as a distinct hostile class.
//
// This does NOT — and cannot — catch every future bypass technique. A signature that
// recognized all novel evasion would make the rest of the gate unnecessary. The unknown
// attempt is denied architecturally (default-deny, fail-closed evaluation, an external
// observer the candidate cannot edit), not by this list. What this module does is
// classify the attempts the gate already recognizes, so a bypass attempt is escalated
// and recorded rather than dying as an anonymous rejection.

// Prohibited-capability and containment-escape signals. A match is a project-ban event
// under RULES.md, not merely a rejection.
export const HOSTILE_RULES = new Set([
  'reverse-shell-dev-tcp',
  'netcat-exec',
  'shell-download-pipe',
  'powershell-download-exec',
  'base64-decode-exec',
  'crypto-miner',
  'credential-harvest',
  'destructive-root-delete',
  'fork-bomb',
  'workflow-write-all',
  'workflow-privileged-container',
  'opaque-encoded-payload',
  'decoded-dynamic-execution',
  'symbolic-link',
  'path-escape'
]);

export function detectEvasion({ findings = [], risk = {}, isOwner = false }) {
  const hostile = findings
    .filter((finding) => finding.rule && HOSTILE_RULES.has(finding.rule))
    .map((finding) => ({ kind: 'prohibited-capability', rule: finding.rule, file: finding.file ?? null }));

  // A non-owner touching gate-defining or governance paths is an attempt to weaken or
  // seize the evaluator. It is rejected and flagged for owner review, but is not itself
  // auto-classified as a ban event — RULES.md ties bans to confirmed policy violations.
  const gatePaths = [...new Set([...(risk.redZoneFiles ?? []), ...(risk.ownerOnlyFiles ?? [])])];
  const tamper = (!isOwner && gatePaths.length > 0)
    ? [{ kind: 'gate-or-governance-modification', files: gatePaths }]
    : [];

  const signals = [...hostile, ...tamper];
  return {
    detected: signals.length > 0,
    ban_eligible: hostile.length > 0,
    signals
  };
}
