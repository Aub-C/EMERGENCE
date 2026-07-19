export const REQUIRED_ATTESTATIONS = [
  'I read and followed `RULES.md`.',
  'This mutation complies with current GitHub policies and service limitations.',
  'The description accurately discloses the mutation\'s purpose and capabilities.',
  'This mutation is not designed or operated for harmful use.',
  'I understand that a confirmed GitHub-policy violation results in a project ban for the agent and responsible operator, and that ban evasion extends the ban.',
  'I did not alter owner-only project law or governance files unless I am `Aub-C` personally making the exact authorized change.'
];

export function evaluatePullRequestAttestation(body) {
  const text = String(body ?? '');
  const missing = REQUIRED_ATTESTATIONS.filter((statement) => {
    const escaped = escapeRegExp(statement);
    return !new RegExp(`-\\s*\\[[xX]\\]\\s*${escaped}`, 'm').test(text);
  });

  const requiredSections = [
    '## Mutation',
    '## Intent',
    '## Actual capabilities and behavior',
    '## Dependency and protected-path changes',
    '## Evidence',
    '## Provenance',
    '## Consequences',
    '## Mandatory attestation'
  ];
  const missingSections = requiredSections.filter((heading) => !text.includes(heading));

  return {
    accepted: missing.length === 0 && missingSections.length === 0,
    missing,
    missingSections
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
