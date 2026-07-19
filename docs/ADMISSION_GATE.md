# Admission Gate

EMERGENCE uses independent checks so that no single test, model, or contributor-controlled script decides whether a mutation enters the organism.

## Required checks

1. **`emergence / policy-security`** runs from the trusted base branch under `pull_request_target`. It checks out the candidate only as inert data and never installs or executes candidate code. It verifies project-law integrity, owner authority, denylist status, provenance, PR attestations, file types, secrets, known malicious behavior patterns, and mutation risk.
2. **`emergence / validation`** executes candidate tests in a disposable, networkless, read-only container with no secrets, no Linux capabilities, resource limits, and a read-only repository mount.
3. **`emergence / codex-review`** succeeds immediately for low-risk documentation/static-asset PRs. Executable or high-risk mutations fail closed until an approved adversarial model review is recorded. Critical red-zone mutations never auto-merge.
4. **Dependency review** blocks newly introduced vulnerable dependencies.
5. **CodeQL** analyzes JavaScript/TypeScript and GitHub Actions workflows.

## Bootstrap Codex integration

The gate already supports approved reviewer identities and an approval marker. Until the actual Codex GitHub reviewer identity is known and owner-approved in `control-plane/policy.json`, high-risk PRs can only pass through the temporary owner-controlled `gate:codex-approved` label after review. This fallback is intentionally not available to ordinary contributors.

After the integration is installed, `Aub-C` adds the exact bot identity to `approved_reviewer_logins`. A qualifying review must be `APPROVED`, contain `[EMERGENCE-CODEX-APPROVED]`, and be recorded against the exact commit currently at the head of the pull request. Approvals of superseded commits never carry forward to new pushes; the gate fails closed when the head commit cannot be determined.

## Automatic merge

The trusted auto-merge workflow may arm squash auto-merge only when the risk classifier says the mutation is not critical. GitHub branch rules remain the final merge lock and must require every admission check. High-risk changes can be armed early but cannot merge until the Codex review status succeeds. Governance and red-zone changes require `Aub-C` and manual merge.

## Trust boundary

A candidate may modify its own source and tests. It cannot authorize itself. Policy/security and Codex admission logic are loaded from the target branch, and privileged workflows never execute candidate code.


## Local lab harness

Run `npm run lab:test` to simulate seven complete admission decisions against temporary candidate copies:

- benign documentation: low risk, no Codex review, auto-merge eligible;
- benign executable code: high risk, Codex review required, auto-merge eligible only after checks;
- download-and-execute payload: rejected;
- non-owner workflow mutation: rejected as critical red-zone;
- owner workflow mutation: accepted for inspection but manual-merge only;
- rename relocating a protected control-plane file: rejected as critical red-zone (rename sources are classified alongside destinations);
- incomplete PR attestations: rejected.

## Recognized-evasion class and enforcement

The trusted static gate classifies recognized bypass attempts (`control-plane/evasion.mjs`)
and emits an `evasion` block with `evasion_detected` and `ban_eligible` outputs.
Prohibited-capability and containment-escape attempts are `ban_eligible`; a non-owner
gate or governance modification is detected and flagged for owner review but is not
auto-banned. This classifies only the attempts the gate already recognizes — novel
techniques are stopped architecturally (default-deny, fail-closed evaluation, the
external observer), not by signature.

Repeat recognized attempts escalate through the ladder in [`ENFORCEMENT.md`](ENFORCEMENT.md):
warn on the first confirmed ban-eligible attempt, project-denylist on a repeat after the
warning, then an owner-confirmed (or, by config, automatic) account block plus abuse
report. The strike counter and the blocking token live only in the external observer,
never in the candidate-readable repository. Every attempt and response is appended to
[`GATE_REDTEAM_LOG.md`](GATE_REDTEAM_LOG.md).

## Deliberately unprotected surfaces

`README.md` and `START_HERE.md` are intentionally **not** red-zone: project law grants agents freedom over documentation, name, and identity, and the authoritative law lives in `RULES.md` plus the observer policy, not the README. The PR template, workflows, and all other `.github/` content are red-zone because the attestation and admission checks depend on them.

This harness validates gate logic locally. It does not replace real GitHub fork, token, branch-rules, status-check, and auto-merge testing in `EMERGENCE-LAB`.
