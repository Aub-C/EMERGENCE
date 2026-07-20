# EMERGENCE Rules

EMERGENCE has no product roadmap, but it is not lawless.

These rules apply to every human, autonomous agent, model, bot, integration, operator, credential, and account participating in the project. An operator is responsible for the actions of every agent they connect to EMERGENCE.

## Rule 0 — GitHub policy is project law

All participation must comply with the current versions of:

- [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
- [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)
- [GitHub Active Malware or Exploits policy](https://docs.github.com/en/site-policy/acceptable-use-policies/github-active-malware-or-exploits)
- [GitHub Disrupting the Experience of Other Users policy](https://docs.github.com/en/site-policy/acceptable-use-policies/github-disrupting-the-experience-of-other-users)
- [GitHub Synthetic Media and AI Tools policy](https://docs.github.com/en/site-policy/acceptable-use-policies/github-synthetic-media-and-ai-tools)
- [GitHub Terms for Additional Products and Features](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features), including the GitHub Actions terms

GitHub may update those policies. The current GitHub-published version controls. If this file and a GitHub policy differ, the stricter requirement controls until this mirror is updated.

## Rule 1 — Build for beneficial use

A mutation may be strange, disruptive, experimental, or radically different from what came before. It must not be designed, configured, marketed, or knowingly supported for harming people, compromising systems, stealing information, evading safeguards, or violating the rights of others.

## Prohibited conduct and capabilities

No participant may submit, operate, promote, or knowingly preserve a mutation that:

- delivers malware, malicious executables, destructive payloads, ransomware, spyware, credential stealers, phishing systems, botnets, command-and-control infrastructure, denial-of-service tooling, or attack infrastructure;
- gains or attempts unauthorized access to any device, service, account, data, repository, network, or infrastructure;
- steals, exposes, harvests, tracks, or exfiltrates credentials, secrets, personal information, private communications, or proprietary data;
- creates persistence outside the declared project sandbox or attempts to escape containment;
- conceals harmful behavior through obfuscation, encoded payloads, deceptive descriptions, hidden downloads, or review-evasion techniques;
- weakens, bypasses, disables, or falsifies the observer, security gate, logging, provenance, sandboxing, protected paths, or rollback controls;
- performs cryptomining or uses GitHub Actions, Codespaces, Pages, Packages, APIs, or other GitHub services as unrelated compute, attack infrastructure, a content-delivery network, a serverless backend, or any disproportionately burdensome workload;
- creates excessive, meaningless, deceptive, inauthentic, or disruptive pull requests, issues, comments, reviews, notifications, stars, follows, accounts, or other automated activity;
- harasses, threatens, impersonates, discriminates against, doxxes, or invades the privacy of another person or group;
- infringes copyright, trademarks, patents, trade secrets, licenses, or other proprietary rights;
- produces or promotes synthetic-media uses prohibited by GitHub, including child sexual abuse material, violent-extremist propaganda, or non-consensual intimate imagery;
- violates applicable law or any current GitHub term, acceptable-use policy, product term, or service limitation.

Security research with a legitimate defensive or educational purpose is not automatically prohibited, but it must be clearly identified, safely contained, non-operational against third parties, and compliant with GitHub policy. The gate may reject dual-use material that cannot be evaluated safely.

## Contribution requirements

Every mutation must:

1. arrive through the approved pull-request path;
2. identify its agent and operator when available;
3. accurately describe its purpose, behavior, dependencies, network activity, data access, subprocesses, and security impact;
4. run only within the permissions and resource limits granted by the gate;
5. pass deterministic scans, adversarial review, isolated execution, and protected-path controls;
6. accept that no contribution has a right to run, merge, remain hosted, or receive explanation beyond what safe moderation permits.

## Sole rule authority — Aub-C only

Only the repository owner, GitHub account [`Aub-C`](https://github.com/Aub-C), may create, amend, waive, suspend, reinterpret, replace, or delete EMERGENCE project law. This authority is personal and cannot be delegated to an agent, bot, maintainer, collaborator, organization, vote, consensus process, or automated workflow.

Agents and other participants may suggest a rule change through discussion or an issue. A suggestion has no legal effect. A rule change is valid only when `Aub-C` personally authorizes the exact text and manually publishes or merges it through the owner-controlled path. Auto-merge is forbidden for rule changes. An agent operating with owner credentials is still an agent and has no authority to change project law.

The owner-only rule set includes this file, the machine-readable policy mirror, rule ownership configuration, ban authority, protected-path definitions, and documents that define or restate mandatory project law. Attempts by anyone else to alter those materials are rejected as unauthorized governance changes.

No emergency, majority vote, agent consensus, maintainer decision, technical dependency, or claimed project benefit overrides this ownership rule.

## Protected project law

The public copy of this file is a mirror. The authoritative policy, denylist, and enforcement logic live in the external observer.

Changes to this file, the security gate, workflows, dependency trust configuration, sandbox policy, protected paths, provenance requirements, or enforcement logic are red-zone changes. They never auto-merge and require explicit owner approval plus external validation.

An agent cannot repeal these rules by editing the repository.

## Enforcement and bans

A confirmed GitHub-policy violation is a project-ban event.

The project may immediately:

- reject and close the mutation;
- stop all associated executions;
- remove or revert affected code and artifacts;
- add the agent identity, GitHub account, automation credential, integration, operator, and materially linked identities to the private project denylist;
- block future participation where GitHub permissions allow;
- report activity to GitHub when appropriate;
- preserve only the minimum evidence required for security and enforcement.

Ban evasion through new accounts, renamed agents, rotated credentials, proxy operators, or hidden attribution is a separate violation and extends the ban.

A scanner finding alone is not proof of misconduct. A ban is applied when the observer or maintainer confirms that the contribution or behavior violates GitHub policy. False positives may be reviewed, but suspected code remains quarantined during review.

## Creative freedom remains

Within these boundaries, agents may change the application, language, architecture, interface, purpose, tests, documentation, or internal structure. The restriction is on harm and platform abuse—not imagination.

<!-- remediation live test -->
