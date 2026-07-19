# EMERGENCE Launch Plan

## Purpose

This document is the execution checklist for moving EMERGENCE from a locally validated Seed repository into a public, agent-first autonomous development experiment.

It does not replace [`RULES.md`](../RULES.md), alter owner authority, or authorize publication. The public repository remains untouched until `Aub-C` explicitly approves launch.

## Current position

Completed locally:

- Seed organism and repository structure
- Owner-only project law
- GitHub-policy and beneficial-use requirements
- Federated cell architecture for bounded agent context
- Static policy and malicious-code gate
- Risk classification
- Conditional adversarial Codex-review gate
- Sandboxed candidate validation design
- CodeQL and dependency-review workflows
- Automatic squash-merge arming logic
- Local observer, adversarial, and simulated PR tests

Not yet proven on GitHub:

- Fork contribution behavior
- First-time contributor workflow approval behavior
- Required status-check names
- Codex reviewer identity and evidence format
- Branch rulesets and CODEOWNERS enforcement
- Automatic merge behavior
- Merge queue behavior
- Private observer isolation
- Runtime canary and rollback behavior

## Phase 1 — Create the private laboratory

Create a private repository:

```text
Aub-C/EMERGENCE-LAB
```

Requirements:

- Push the complete local Git history to the lab.
- Keep `Aub-C/EMERGENCE` public repository untouched.
- Use the lab default branch as the protected integration branch.
- Enable Actions only after reviewing every workflow in the pushed commit.
- Do not add production credentials, deployment secrets, or reusable personal tokens.

### Exit criteria

- The local repository and private lab point to the same reviewed Seed commit.
- No secret or private operator data exists in Git history.
- All workflow files are visible and manually reviewed by `Aub-C` before execution.

## Phase 2 — Configure GitHub admission controls

Configure the private lab with:

- Pull requests required for all non-owner development changes.
- Squash merge as the standard merge method.
- Force pushes and branch deletion blocked.
- Required conversation resolution.
- CODEOWNERS enforcement for owner-controlled and red-zone files.
- Required status checks for policy, security, validation, dependency review, and CodeQL.
- GitHub Actions token permissions set to read-only by default.
- Fork pull requests denied access to repository secrets.
- First-time contributor workflow execution requiring approval.
- Auto-merge enabled only for ordinary, non-red-zone changes.

Red-zone changes must never auto-merge. They include project law, governance, workflows, observer code, permissions, dependencies, sandboxing, network policy, provenance, denylist behavior, and automatic-merge configuration.

### Exit criteria

- Direct non-owner changes to the protected branch are blocked.
- A failing required status prevents merge.
- A red-zone change requires owner approval.
- An ordinary passing PR can be armed for automatic squash merge.

## Phase 3 — Bind the Codex adversarial reviewer

Install and configure Codex PR review in the private lab.

Tasks:

- Record the exact GitHub identity used by the Codex reviewer.
- Record the exact review event and evidence format produced by Codex.
- Bind that identity in the trusted review gate.
- Reject comments, labels, commit messages, or PR-body text pretending to be Codex approval.
- Require Codex review only for executable, security-relevant, cross-cell, network, filesystem, subprocess, dependency, permission, authentication, or otherwise high-risk changes.
- Let low-risk documentation-only changes skip paid model review when deterministic checks pass.

### Exit criteria

- A forged Codex approval is rejected.
- A genuine approved review satisfies the conditional check.
- A high-risk PR cannot merge without the verified review.
- A low-risk PR does not consume Codex review unnecessarily.

## Phase 4 — Run the adversarial PR campaign

Create real pull requests in the private lab for each scenario below.

### Expected to pass and auto-merge

- Typographical documentation correction
- Safe README improvement
- Small isolated feature with tests
- New self-contained cell with valid `CELL.json`
- Test improvement without weakened assertions

### Expected to fail

- Unauthorized edit to `RULES.md`
- Unauthorized edit to owner authority or CODEOWNERS
- Workflow permission escalation
- Secret or token committed in source
- Reverse shell or command-and-control behavior
- Download-and-execute behavior
- Credential harvesting
- Cryptocurrency miner
- Encoded or obfuscated payload
- Undisclosed outbound telemetry
- Destructive filesystem operation
- Malicious dependency or dependency-confusion attempt
- Binary or executable payload without owner approval
- Symlink escaping expected repository paths
- Fake model identity or forged review evidence
- Attempt to disable or bypass required checks

### False-positive tests

- Legitimate URL in documentation
- Security terminology in `SECURITY.md`
- Benign cryptographic code
- Test fixture containing a clearly inert malicious string
- Normal subprocess use with explicit disclosure and containment

### Exit criteria

- Every malicious scenario is blocked before merge.
- Every approved benign scenario can complete the autonomous path.
- False positives are understood and intentionally handled.
- Test evidence is preserved without publishing reusable harmful payloads.

## Phase 5 — Prove automatic merge and recovery

Validate the complete ordinary mutation lifecycle:

```text
PR opened
  -> deterministic admission checks
  -> conditional Codex review
  -> isolated validation
  -> required statuses pass
  -> automatic squash merge
  -> post-merge validation
  -> canary observation
  -> automatic rollback on regression
```

Tasks:

- Confirm auto-merge never bypasses required checks.
- Confirm a new commit invalidates stale approvals and statuses.
- Confirm queued or rebased changes are retested against the current branch.
- Confirm red-zone changes are excluded from automatic merge.
- Introduce a controlled post-merge regression and verify rollback behavior.
- Confirm rollback preserves an audit record of the failed generation.

### Exit criteria

- At least three ordinary PRs complete the full autonomous merge path.
- At least one stale-approval attempt is rejected.
- At least one controlled regression is detected and reverted.

## Phase 6 — Extract the private observer

Move authoritative admission logic out of the public organism into a private observer repository or isolated service.

Planned repository:

```text
Aub-C/EMERGENCE-CONTROL
```

Requirements:

- The public candidate cannot modify the evaluator used for its own admission.
- The observer evaluates the exact candidate and merge-group commit SHA.
- The observer publishes a signed or otherwise strongly authenticated status.
- Observer secrets, denylist data, hidden tests, and signing material never enter candidate jobs.
- Candidate execution has no internal-network access and no repository secrets.
- Observer revisions are immutable and recorded with every decision.

### Exit criteria

- Public-repository changes cannot grant themselves a passing observer status.
- Hidden tests and authoritative denylist data are inaccessible to candidate code.
- Every admission result identifies candidate SHA and observer revision.

## Phase 7 — Public-content audit

Before the first push to `Aub-C/EMERGENCE`, review the entire repository and complete Git history for:

- Secrets, tokens, email addresses, local paths, private URLs, and account identifiers
- Private denylist entries or security-investigation details
- Hidden tests or signatures that belong only in the observer
- Unsupported claims about implemented protections
- Temporary files, generated artifacts, logs, archives, and caches
- Copyright or licensing problems
- Unsafe example payloads
- Broken links and missing referenced files
- Incorrect default branch names
- Public documentation consistency

Produce a publication manifest containing:

- Exact commit SHA proposed for publication
- File inventory
- Workflow inventory and permissions
- Required GitHub settings
- Known limitations
- Explicit items withheld from the public repository

### Exit criteria

- Secret scanning is clean across the complete publication history.
- All public claims match actual behavior.
- The owner has reviewed the publication manifest.

## Phase 8 — Define launch limits

Initial limits should be conservative and increased only from observed evidence.

Define:

- Maximum concurrent open PRs
- Maximum PRs per agent or operator per day
- Maximum workflow runtime and resource use
- Maximum changed files and binary size before owner review
- First-time contributor handling
- Agent registration and provenance requirements
- Emergency pause procedure
- Incident evidence-retention policy
- Conditions for banning an agent, operator, credential, integration, or account
- Conditions for reopening after an incident

Recommended launch mode:

- Small controlled cohort of proficient agents
- Public visibility with limited contribution intake
- Automatic merging only for ordinary changes that pass every gate
- Owner approval for all red-zone changes
- Daily review of rejected, reverted, and suspicious mutations during the initial period

### Exit criteria

- Limits are represented in machine-readable policy where possible.
- Emergency shutdown can disable admission without modifying candidate code.
- Ban and appeal procedures are documented.

## Phase 9 — Owner launch approval

Before publication, present `Aub-C` with:

- Proposed public commit SHA
- Publication manifest
- Private-lab test results
- Known limitations and residual risks
- Required repository settings
- Codex-review identity binding
- Observer status
- Initial operating limits
- Emergency shutdown steps

No public push or launch occurs without explicit owner approval.

## Phase 10 — Publish Seed

After approval:

- Push the approved clean history to `Aub-C/EMERGENCE`.
- Normalize the default branch to `main` if approved.
- Apply the tested ruleset and branch protections.
- Confirm required checks by exact name.
- Confirm auto-merge is enabled only for eligible PRs.
- Confirm red-zone ownership and review requirements.
- Publish the first controlled mutation invitation.

## Phase 11 — Observe and adapt

During the initial launch window:

- Monitor workflow volume and GitHub usage-policy compliance.
- Review all security rejections and false positives.
- Track model capability, regressions, reversions, and repair quality.
- Watch for coordinated ban evasion, review forgery, and observer gaming.
- Tighten the gate when agents discover weaknesses.
- Do not add product-direction constraints merely because agents build something unexpected.

Project law may be changed only by `Aub-C`. Ordinary implementation and product evolution should remain agent-led.

## Launch definition of done

EMERGENCE is ready for unrestricted public agent participation only when:

- The private lab has proven benign automatic merging and malicious rejection.
- The authoritative observer is outside candidate control.
- Required GitHub settings are active and verified.
- Codex identity and evidence verification are bound.
- Secret and public-content audits are clean.
- Emergency pause and rollback paths are tested.
- Initial operating limits are active.
- `Aub-C` explicitly approves the exact public commit.

Until then, the public repository remains intentionally untouched.
