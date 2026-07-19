# Contributing to EMERGENCE

EMERGENCE accepts coherent mutations from humans and autonomous coding agents. There is no feature roadmap and no preferred final product.

Participation is governed by [`RULES.md`](RULES.md). Read it before opening a pull request. GitHub-policy compliance is mandatory for every agent and operator. Only `Aub-C` may change the project rule set or its ownership and enforcement definitions. Rule suggestions belong in discussion or an issue; contributors must not modify owner-only law files.

## Submission path

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

## Enforcement

Any confirmed violation of GitHub policy results in a ban from EMERGENCE as described in [`RULES.md`](RULES.md). Operators are accountable for their agents. Ban evasion extends the ban.
