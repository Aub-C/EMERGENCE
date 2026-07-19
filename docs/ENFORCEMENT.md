# Enforcement

How EMERGENCE responds when an identity repeatedly attempts to bypass the admission
gate. The escalation logic is `control-plane/enforcement.mjs` (a pure decision
function); the configuration is `enforcement.escalation` in `control-plane/policy.json`;
the recognized-attempt signal is `control-plane/evasion.mjs`.

## What "block them" can and cannot mean

Precision matters here — overstating this would be exactly the kind of false claim the
project forbids.

| Level | What it is | Ours to automate? |
|---|---|---|
| **Project ban** | Add the identity and its linked identities to the private denylist; the gate rejects every future contribution from them. | **Yes, fully.** The denylist is ours. |
| **Account block** | `PUT /user/blocks/{username}` (or `/orgs/{org}/blocks/{username}`) — stops that account from interacting with the owner's account/repository. Reversible. | **Yes, with a caveat.** Needs a privileged token in a trusted workflow (the default `GITHUB_TOKEN` cannot block users). It is **not** a global suspension. |
| **Global suspension** | GitHub disables the account platform-wide. | **No.** Only GitHub can do this, via an abuse report. It cannot be automated into an instant ban. |

So "auto-block their GitHub account" concretely means: auto **project-ban**, plus an
account-level **interaction block** from the owner, plus an abuse **report** to GitHub
which then decides on any global action.

## The escalation ladder

Driven by the evasion classifier. A `ban_eligible` signal is a prohibited-capability or
containment-escape attempt (reverse shell, download-and-execute, miner, credential
harvest, obfuscated payload, symlink/path escape, workflow privilege escalation). A
`detected`-but-not-`ban_eligible` signal is a non-owner gate/governance modification.

1. **First confirmed ban-eligible attempt → `warn`.** Reject the PR, post the warning,
   record the strike. One warning, by design — repeat offenders are the target, not
   first mistakes or false positives.
2. **Repeat ban-eligible attempt after the warning (strike ≥ `ban_threshold`, default 2)
   → `ban`.** Auto-add the identity and its linked identities
   (`block_identity_fields`) to the project denylist; recommend or execute the account
   block per `account_block`; file the abuse report if `report_abuse` is set.
3. **Ban evasion (a denied or linked identity reappears) → immediate `ban`.** Per
   RULES.md this is a separate violation; it does not get a fresh warning.
4. **Gate/governance tampering that is not a prohibited capability → `flag`.** Rejected
   and surfaced for owner review, never auto-banned — editing project law without
   authority is unauthorized, but it is not by itself a GitHub-policy violation.

`account_block` defaults to **`owner-confirmed`**: the observer prepares the block and
report as a one-tap owner action rather than firing autonomously. Set it to
`automatic` for hands-off blocking once you trust the false-positive rate. The reason to
start owner-confirmed: a benign security-research PR or an inert malicious test fixture
(both explicitly allowed by RULES.md and the launch plan's false-positive suite) can trip
a hostile-capability detector, and auto-blocking real accounts on a false positive is
itself a way to get flagged by GitHub for abusing the block feature.

## Why this cannot live in the public repo

The strike counter and the block/report token are the two pieces an attacker most wants
to reach. If strike state lived in the candidate-readable repository, an attacker could
reset their own count; if the token lived in a candidate-triggerable workflow, they could
steal it. Both belong to the **external observer** (`docs/LAUNCH_PLAN.md` Phase 6):

- **Strike state:** external append-only store keyed by identity; the observer reads the
  prior count, calls `decideEnforcement`, and appends the new strike.
- **Token:** a fine-grained PAT with only the blocking scope, held as an observer secret,
  never exposed to `pull_request_target` or candidate jobs.

`decideEnforcement` is written pure precisely so the observer can own all state and
side effects around it.

## Observer wiring (reference)

When the observer records a `ban` decision, it performs, in order:

```bash
# 1. Project ban — append linked identities to the private denylist and commit it
#    in the observer repo (never the public organism).

# 2. Warning / notice on the pull request (pull-requests: write is enough):
gh pr comment "$PR_URL" --body "Enforcement: repeat gate-bypass attempt. See RULES.md."
gh pr close "$PR_URL"

# 3. Account block from the owner (requires the privileged blocking token, NOT GITHUB_TOKEN):
gh api --method PUT "user/blocks/$LOGIN"
#    org-owned variant: gh api --method PUT "orgs/$ORG/blocks/$LOGIN"

# 4. Abuse report to GitHub is filed through the reporting UI / contact flow; GitHub
#    decides any global action. Do not represent a project ban as a GitHub suspension.
```

Every enforcement action appends an entry to `docs/GATE_REDTEAM_LOG.md` (the attempt and
the response) and preserves only the minimum evidence needed, per the retention policy.

## Not yet live

None of this executes today. The public repository is untouched, there is no external
observer, and no blocking token exists. This document plus `enforcement.mjs` are the
proven-in-unit-tests design to implement during the private-lab and observer phases.
