# GitHub Bootstrap

## Public organism

The public repository `Aub-C/EMERGENCE` already exists. Do not push the private working tree until the owner explicitly approves publication after the complete security, policy, and public-content review.

Repository settings:

1. Enable squash merging.
2. Keep auto-merge disabled until the external observer is authoritative.
3. Keep contribution surfaces limited until moderation, rate limits, and the security gate are ready; then enable forks, issues, and discussions deliberately.
4. Create rulesets targeting the repository's actual default branch (`master` initially; rename to `main` before launch if desired):
   - require a pull request;
   - require `emergence / policy-security`;
   - require `emergence / validation`;
   - require `emergence / codex-review`;
   - require `Dependency review / Dependency review`;
   - require `CodeQL / CodeQL (javascript-typescript)`;
   - require `CodeQL / CodeQL (actions)`;
   - require branches to be up to date;
   - block force pushes;
   - block deletion;
   - require merge queue when available;
   - require zero approving reviews only for ordinary mutations after the external gate is proven;
   - require CODEOWNERS review for governance and security paths;
   - restrict owner-only law paths to `Aub-C`;
   - require manual `Aub-C` publication for rule changes;
   - require owner approval for all other red-zone paths and controls.
5. Keep the default `GITHUB_TOKEN` read-only unless a specific trusted workflow needs more.
6. Do not add secrets consumed by pull-request workflows.

Do not enable or publish `arm-auto-merge` until all required statuses, protected paths, denylist enforcement, Codex reviewer identity, and red-zone review rules are active. Candidate-owned validation is necessary but never authoritative by itself.

## Private observer

Create `Aub-C/emergence-control` as a private repository and move `control-plane/` into its root.

Do not treat the bootstrap observer as production containment. Put candidate execution inside an ephemeral VM or strongly isolated container before opening the project to unknown contributors.


## Mandatory policy controls before publication

- `RULES.md`, `CONTRIBUTING.md`, and `SECURITY.md` reviewed and approved.
- GitHub private vulnerability reporting enabled.
- Current GitHub policies mapped into the observer policy.
- Private denylist operational and bound to agent, operator, GitHub actor, and automation credential identities.
- Confirmed policy violations reject, contain, and ban the responsible agent/operator.
- Rate limits prevent excessive PRs, comments, workflow reruns, and notification abuse.
- GitHub Actions workloads limited to producing, testing, securing, deploying, or publishing EMERGENCE.
- No untrusted code executes with secrets, write tokens, persistent runners, host mounts, privileged containers, or internal-network access.
- Red-zone changes cannot auto-merge.
- Rule-set changes are authored, authorized, and manually published only by `Aub-C`; agents and automation cannot exercise this authority.


## Private launch lab

Before the public repository receives Seed, create a private `Aub-C/EMERGENCE-LAB` repository and push this history there. The lab must prove:

- benign documentation PRs pass without Codex review and auto-merge;
- benign executable PRs remain blocked until approved adversarial review evidence exists;
- workflow, policy, dependency, and control-plane PRs never auto-merge;
- non-owner red-zone changes fail;
- malicious fixtures for secrets, reverse shells, download-and-execute, cryptomining, workflow permission escalation, unexpected binaries, and symlinks fail;
- fork PR code receives no secrets or write token;
- the privileged policy workflow never executes candidate code;
- automatic merge waits for every required branch status.

The lab is not yet created. An authenticated `gh` CLI is now available on the owner's machine (2026-07-18), so creation is unblocked and waits only on the owner's explicit go-ahead.
