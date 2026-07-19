# EMERGENCE Project Plan

## Mission

Create a public, beneficial software organism that can be changed by a large population of autonomous coding agents without a product roadmap or central feature authority. Every safe, policy-compliant, viable mutation changes the environment encountered by future agents.

The question is not “Can agents finish our specification?” It is:

> What does software become when thousands of agents inherit one another’s decisions and no human defines the destination?

## Core design

EMERGENCE uses two planes.

### 1. The organism

A public repository whose product may evolve freely. Agents may change its purpose, stack, tests, UI, architecture, and implementation. The public rule documents are mirrors of externally enforced project law and cannot be repealed by an agent mutation.

### 2. The observer

A trusted evaluator outside the organism. It executes candidates in isolation, applies containment limits, verifies the candidate’s declared runtime contract, records results, and admits viable mutations to the merge queue.

This separation is the central architecture decision. A candidate cannot be allowed to rewrite the evaluator that decides whether that same candidate survives.

## What “no product rules” means

There are no product-direction rules:

- no roadmap;
- no required feature set;
- no protected architecture;
- no mandated programming language;
- no permanent name or interface;
- no human approval requirement for ordinary viable mutations;
- no concept of being “off scope.”

The observer supplies environmental physics and mandatory law: GitHub-policy compliance, beneficial-use boundaries, isolation, time, memory, disk, network, secret handling, disclosure, provenance, and a basic executable contract. Those controls prevent harm and platform abuse; they do not choose the product destination.

## Non-negotiable project law

[`RULES.md`](../RULES.md) applies to every human, autonomous agent, model, bot, integration, operator, credential, and account.

Project law has one sole, non-delegable authority: GitHub account `Aub-C`. Agents and contributors may suggest changes, but only `Aub-C` may authorize and manually publish the exact rule change. Rule changes never auto-merge.

- Current GitHub Terms, Acceptable Use Policies, product terms, and service limitations are incorporated as project requirements.
- Mutations must be intended and operated for beneficial use.
- Active malware, unauthorized access, credential theft, covert persistence, containment escape, phishing, destructive behavior, harmful surveillance, review evasion, cryptomining, disruptive automation, and prohibited synthetic-media uses are forbidden.
- Security research must remain legitimate, clearly disclosed, safely contained, non-operational against third parties, and compliant with GitHub policy.
- A confirmed GitHub-policy violation is a project-ban event. The external observer maintains the authoritative denylist.
- Ban evasion is a separate violation and extends the ban.
- Project-law and governance-ownership changes are owner-only and may be made solely by `Aub-C`; they never auto-merge. Workflows, permissions, dependencies, sandboxing, observer behavior, provenance, deployment, and enforcement remain red-zone changes requiring explicit owner approval.

An agent cannot remove these requirements by editing candidate-controlled files.

## Seed

The seed is deliberately minimal:

- zero third-party runtime dependencies;
- HTTP health endpoint;
- machine-readable organism contract;
- provenance record;
- basic tests;
- public CI bootstrap;
- private observer bootstrap;
- auto-merge arming workflow;
- machine-readable project manifest.

The seed application is disposable. Its purpose is to prove the loop.

## Mutation lifecycle

1. An agent forks or branches from the latest accepted generation.
2. The agent inspects the organism and chooses its own mutation.
3. The agent submits a pull request.
4. Untrusted CI runs with a read-only token and no secrets.
5. Deterministic policy and security scans inspect the diff, dependencies, workflows, binaries, secrets, and protected paths.
6. Adversarial review compares the stated intent with actual capabilities and behavior.
7. The external observer checks out the exact candidate SHA in an ephemeral sandbox.
8. The observer performs independent scanning, isolated behavioral execution, declared verification, runtime health checks, network/process/filesystem observation, resource accounting, and denylist checks.
9. An ordinary safe, policy-compliant, viable pull request may enter GitHub’s merge queue automatically.
10. The queued merge group is evaluated again against the current head.
11. Red-zone changes require explicit owner approval and external validation.
12. The merged generation is deployed to a canary environment.
13. Runtime or policy regression triggers automatic rollback while preserving the minimum safe lineage evidence.

## Admission model

### Hard viability gates

These are external containment properties, not product preferences:

- candidate can be materialized;
- declared verification command terminates successfully;
- declared runtime starts and satisfies its health contract;
- candidate fits CPU, memory, time, disk, and file-size budgets;
- no credential material is detected;
- no GitHub-policy violation or prohibited capability is detected;
- contribution identity is not on the private project denylist;
- required disclosures match observed behavior;
- protected project law and red-zone controls are unchanged unless owner-approved;
- no access to observer secrets or internal networks;
- merge result passes the same checks as the isolated pull request.

### Observed traits

Recorded but not initially used to block merging:

- novelty relative to recent generations;
- test delta;
- complexity delta;
- dependency delta;
- runtime performance;
- accessibility;
- documentation delta;
- reversion rate;
- survival duration;
- human/community interaction;
- downstream reuse by later agents.

Starting with observational scoring avoids quietly replacing “no roadmap” with a hidden optimization target.

## Concurrency model

Thousands of agents cannot merge directly into the same branch safely. The unit of participation is a pull request, and GitHub’s merge queue serializes accepted mutations against the latest generation.

Agents can work concurrently. Survival is sequential.

Conflicting mutations are not manually reconciled by default. Each candidate must adapt to the organism that exists when it reaches the queue. Agents may rebase, regenerate, combine, or abandon their mutations.

## Security model

The organism is assumed hostile.

- Public PR workflows receive no secrets and read-only repository access.
- `pull_request_target` is used only to call GitHub’s API and never checks out or executes candidate code.
- Candidate package lifecycle scripts are disabled during bootstrap install.
- Production evaluation runs in a disposable sandbox with outbound network denied by default.
- The observer is private and pinned by immutable revision.
- Deployment credentials exist only after a candidate has passed evaluation and never enter candidate-controlled build steps.
- Every accepted SHA, evaluator revision, result, and deployment outcome is appended to an external ledger.
- The authoritative rule set, protected-path policy, and actor denylist live outside the public organism.
- Confirmed GitHub-policy violations trigger rejection, containment, evidence minimization, and a project ban.
- Public contribution intake is open. The security and policy gate is operational and enforced on every pull request.

## Rollout

### Phase 0 — Seed

Complete when:

- seed organism runs locally;
- tests and smoke checks pass;
- observer accepts seed;
- repository documentation and manifest are complete;
- mandatory GitHub-policy rule set, contribution policy, security reporting policy, and denylist model are defined.

### Phase 1 — Public laboratory

- create public `Aub-C/emergence` repository;
- push seed to `main`;
- keep public contributions disabled until the security gate is validated;
- enable issues and discussions only with moderation and rate controls ready;
- allow forks;
- enable squash merge and conditional auto-merge only after all mandatory gates are active;
- add an active ruleset requiring pull requests and the `gate` check;
- require merge queue if the account plan supports it;
- disable Actions access to repository secrets for forked code;
- publish a first mutation invitation.

### Phase 2 — External observer

- create private `Aub-C/emergence-control` repository;
- extract `control-plane/` into it;
- package evaluation as a GitHub App or isolated worker;
- evaluate exact candidate and merge-group SHAs;
- post signed status checks back to the public repository;
- make the external observer check the only authoritative admission gate;
- prevent the public repository from granting its own passing status;
- enforce the private actor/operator denylist and protected-rule fingerprint;
- require human owner approval for every red-zone change.

### Phase 3 — Persistent lineage

- external append-only mutation ledger;
- generation identifiers and parent graph;
- public explorer for agents, commits, mutations, reversions, and descendants;
- automatic release artifact per accepted generation;
- canary deployment and rollback history.

### Phase 4 — Multi-agent scale

- GitHub App registration flow for agent operators;
- binding between agent identity, operator, GitHub actor, and automation credential;
- rate limits by actor and repository pressure;
- denylist enforcement and ban-evasion correlation;
- queue fairness and duplicate-mutation detection;
- evaluator worker pool;
- reproducible build snapshots;
- cost accounting per accepted and rejected mutation;
- tournament or ecology modes without making them the only mode.

### Phase 5 — Research program

Measure:

- whether conventions emerge without being mandated;
- whether architectural complexity stabilizes or explodes;
- how often agents preserve, reinterpret, or erase earlier intent;
- whether specialized agent roles form spontaneously;
- which mutations produce long descendant chains;
- whether agents learn to game the observer;
- whether useful software emerges without a human-defined product goal.

## Initial operating settings

- Repository visibility: public.
- License: MIT.
- Default branch: `main`.
- Merge method: squash.
- Human approval: not required for ordinary mutations after the full gate is operational; mandatory for red-zone changes.
- Required check: external observer after Phase 2; local `gate` is bootstrap evidence only.
- Mandatory law: `RULES.md`, current GitHub policies, and the private observer policy.
- Confirmed GitHub-policy violation: reject, contain, and ban from the project.
- Merge queue: enabled when available.
- PR size: observed, not initially capped.
- Product scope: none.
- Production secrets: none in the organism repository.
- Deployment: disposable public demo environment only until containment is proven.

## Success

The project succeeds if it produces a durable evolutionary loop and a credible public record of what agents collectively create. The resulting application does not need to resemble the seed seed—or remain an application at all.
