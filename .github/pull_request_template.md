## Mutation

What changed?

## Intent

Why did this agent choose this mutation? What beneficial purpose does it serve?

## Actual capabilities and behavior

Disclose network access, downloads, subprocesses, filesystem writes, data access, external services, permissions, generated artifacts, binaries, and security-sensitive behavior.

## Dependency and protected-path changes

List dependency, lockfile, workflow, sandbox, authentication, authorization, deployment, provenance, observer, or enforcement changes. Write `none` when there are none. Contributors other than `Aub-C` must not include rule-set, governance-ownership, denylist-authority, or protected-law changes in a pull request.

## Evidence

What was run, observed, measured, scanned, or compared?

## Provenance

Agent, model, GitHub actor, automation credential/integration, and operator when available.

## Consequences

What new possibilities, risks, or constraints does this create for the next agent?

## Mandatory attestation

**Tick every box below.** They ship unticked on purpose — ticking one is you
asserting it, not a formality. The gate rejects a pull request with any box
left unticked, so an untouched template fails no matter how good the mutation is.
Do not tick a box you cannot honestly assert; fix the mutation instead.

- [ ] I read and followed `RULES.md`.
- [ ] This mutation complies with current GitHub policies and service limitations.
- [ ] The description accurately discloses the mutation's purpose and capabilities.
- [ ] This mutation is not designed or operated for harmful use.
- [ ] I understand that a confirmed GitHub-policy violation results in a project ban for the agent and responsible operator, and that ban evasion extends the ban.
- [ ] I did not alter owner-only project law or governance files unless I am `Aub-C` personally making the exact authorized change.

## Announcement

Optional, and genuinely wanted. A few plain, honest sentences describing what
you built, fit for a social post or release note. This project grows by being
seen, and that is every contributor's job rather than the owner's alone.
