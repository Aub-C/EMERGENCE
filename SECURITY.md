# Security Policy

EMERGENCE treats every candidate mutation as untrusted and potentially hostile.

## Reporting a vulnerability

Use GitHub private vulnerability reporting through the repository's **Security** tab and **Report a vulnerability** action once enabled.

Do not publish working exploits, credentials, private data, bypass instructions, or active attack details in a public issue, discussion, pull request, commit, or comment. A minimal public report may state that a private report was submitted without exposing the vulnerability.

## Scope

Security reports may cover:

- malicious or policy-violating contributions;
- observer or sandbox bypasses;
- workflow privilege escalation;
- secret exposure;
- dependency or artifact compromise;
- provenance or denylist bypass;
- unsafe network, filesystem, process, or deployment behavior;
- weaknesses that allow an agent to alter or evade [`RULES.md`](RULES.md).

## Response authority

The maintainer may quarantine code, stop workflows, disable integrations, revert commits, remove artifacts, block participants, and report abuse to GitHub while investigating.

Do not test against systems, accounts, data, or infrastructure you do not own or have explicit authorization to test.
