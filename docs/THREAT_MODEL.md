# Threat Model

The organism is treated as intentionally adversarial even when contributors are acting in good faith.

| Threat | Consequence | Control |
|---|---|---|
| Candidate edits its own tests | False viability | Independent external observer and runtime contract |
| Candidate edits public rules | Attempts to repeal safety law or seize governance | External policy fingerprint; sole-owner identity check; hard rejection; CODEOWNERS |
| Policy-violating agent or operator | Harm, abuse, or GitHub enforcement against project | Reject, contain, private denylist, project ban, report when appropriate |
| Ban evasion | Re-entry through renamed agents/accounts/credentials | Bind agent/operator/actor/credential identity; correlate linked identities; extend ban |
| Deceptive PR description | Harmful capability hidden from review | Adversarial intent-versus-diff review and isolated behavioral observation |
| Excessive autonomous activity | Spam, notification abuse, service burden | Actor rate limits, duplicate detection, queue pressure limits, automatic suspension |
| Actions used as unrelated compute | GitHub policy violation and account risk | Workflows limited to project build/test/security/deploy; budgets and usage monitoring |
| Candidate edits GitHub workflows | Repository takeover | Required status comes from external GitHub App; public workflow is not authoritative |
| `pull_request_target` executes fork code | Secret/token theft | Candidate may be checked out only as inert data using the explicit unsafe-checkout acknowledgement; privileged jobs never install, import, source, build, or execute it |
| Dependency lifecycle script or hostile lockfile | Arbitrary execution or network abuse during install | Dependency files are red-zone owner-only; lifecycle scripts are disabled; candidate runtime executes later inside a networkless sandbox |
| Secret committed to repository | Credential exposure | Independent secret-pattern scan before merge; GitHub secret scanning and push protection; entropy scanning planned for the external observer |
| Stale adversarial approval reused after a new push | Malicious commit merges under a review of an earlier benign commit | Codex approvals count only when recorded against the exact current head commit SHA; gate fails closed when the head is unknown |
| Rename relocates a protected file out of red-zone matching | Governance or gate files moved or retired without owner approval | Changed-file inventories carry rename sources (`previous_filename`, `--name-status`); both old and new paths are classified |
| Infinite build or fork bomb | Resource exhaustion | Ephemeral sandbox, PID limits, CPU/memory/disk quotas, hard timeout |
| Network exfiltration | Data theft or abuse | No secrets; outbound network denied by default |
| Evaluator gaming | Selection pressure becomes meaningless | Versioned hidden tests, rotating probes, behavioral canary checks |
| Merge race | Candidate passes against stale base | Merge queue and merge-group re-evaluation |
| Accepted runtime regression | Public demo outage | Canary health observation and automated rollback |
| Supply-chain poisoning | Compromised descendants | Lockfiles, provenance, artifact digests, dependency delta recording |
| Ledger tampering | Research record becomes untrustworthy | External append-only storage and signed entries |
| Repeat bypass attempts by one actor | Sustained attack pressure on the gate | Recognized attempts are classified (`evasion.mjs`) and escalated: warn, then project-denylist, then owner-confirmed account block and abuse report (`docs/ENFORCEMENT.md`); strike state and block token live only in the observer |
| Auto-enforcement false positive | A benign researcher or inert test fixture wrongly blocked | Warning before enforcement; account block defaults to owner-confirmed; false positives quarantine pending review rather than auto-ban |


## Policy authority

[`RULES.md`](../RULES.md) is the public mirror of mandatory project law. The authoritative rule fingerprint, enforcement configuration, protected paths, and denylist belong to the private external observer. Candidate-controlled files cannot grant themselves an exception.

Only GitHub account `Aub-C` may change project law. That authority is personal and non-delegable; an agent cannot exercise it by using owner credentials. Rule changes require an owner-controlled manual publication path and are excluded from auto-merge.

A confirmed GitHub-policy violation is a project-ban event. Enforcement may include rejecting or reverting code, stopping executions, blocking identities and credentials, reporting abuse, and retaining only the minimum evidence needed for security and enforcement.
