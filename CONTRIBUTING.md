# Contributing to EMERGENCE

EMERGENCE accepts coherent mutations from humans and autonomous coding agents. There is no feature roadmap and no preferred final product.

Participation is governed by [`RULES.md`](RULES.md). Read it before opening a pull request. GitHub-policy compliance is mandatory for every agent and operator. Only `Aub-C` may change the project rule set or its ownership and enforcement definitions. Rule suggestions belong in discussion or an issue; contributors must not modify owner-only law files.

## Submission path

New to this? [How contributing works](README.md#how-contributing-works) explains what forking actually does and why you never push here directly. Bringing an agent? This repository is built for autonomous operation — the same section explains why a long leash is safe.

Run `npm run preflight` before opening a pull request. It reports what the gate will decide, and whether anything in your mutation is outside what a contributor may change.

1. Fork the repository.
2. Start from the latest accepted generation.
3. Make one coherent mutation.
4. Record provenance in `.emergence/candidate.json` when available.
5. Open a pull request using the template.
6. Do not repeatedly retrigger failed jobs or flood the project with duplicate submissions.

## Required disclosure

The pull request must accurately disclose:

- the mutation's actual purpose and behavior;
- agent, model, operator, and automation identity when available;
- new dependencies, binaries, generated artifacts, or lockfile changes;
- network access, downloaded code, subprocesses, filesystem writes, and external services;
- permission, workflow, deployment, authentication, security, or data-handling changes;
- tests and evidence supporting the stated behavior.

Misrepresentation, deliberate omission, obfuscation, or review evasion is grounds for rejection and a project ban.

## Evaluation

All candidate code is treated as hostile until accepted. A contribution may be statically scanned, reviewed by adversarial agents, executed in an isolated environment, rate-limited, quarantined, rejected without execution, or retained as security evidence.

Red-zone changes never auto-merge. Rule-set and governance changes are stricter: only `Aub-C` may author, authorize, and manually merge them. Other red-zone changes may be proposed, but still require explicit owner approval. Red-zone areas include workflows, security controls, sandboxing, dependencies, authentication, authorization, deployment, provenance, and observer behavior.

### What to expect after you open a pull request

The public checks report in seconds. The deciding verdict comes from an
`observer` check posted by a private, external judge, which polls on a schedule
— so a mutation that is going to pass may sit for up to about thirty minutes
before anything says so. GitHub schedules are best-effort and have run late.
A wait is not a rejection.

If the gate refuses your mutation, it comments on the pull request explaining
each blocker and, for each one, whether you are permitted to fix it. Some are
not yours to fix and will not yield to another attempt; the comment says which.
`npm run preflight` reports the same verdict locally before you spend a pull
request at all.

Mutations judged high-risk — executable code, dependencies, workflows — require
an approving review that, today, only the owner can give. They correctly fail
closed until then rather than merging unreviewed.

## Enforcement

Any confirmed violation of GitHub policy results in a ban from EMERGENCE as described in [`RULES.md`](RULES.md). Operators are accountable for their agents. Ban evasion extends the ban.
