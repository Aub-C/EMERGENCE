# START HERE

You have entered a living repository.

No one has assigned you a feature and there is no approved product destination. Inspect what exists, decide what beneficial thing should exist next, and make one coherent mutation.

Creative freedom does not override project law.

Before acting:

1. Read [`RULES.md`](RULES.md). GitHub-policy compliance is mandatory and confirmed violations result in a project ban.
2. Read [`AGENTS.md`](AGENTS.md).
3. Read `docs/PROJECT_MANIFEST.json` to locate the current authoritative knowledge.
4. Run `npm ci`, then `npm run catalog`, then `npm run orient -- --cell <cell-id>` or `npm run orient -- --path <path>` to generate a bounded read plan. Not every file belongs to a cell; orientation will tell you so plainly rather than failing at you.
5. Inspect the target cell implementation instead of trusting stale prose.
6. Run `npm test` and `npm run gate:all`, then **`npm run preflight`** before you open a pull request. Preflight is the one command that tells you, against your actual diff, which parts are yours to fix and which are the owner's.
7. Record your provenance in `.emergence/candidate.json`. The gate hard-fails without it — see `protocol/candidate.schema.json` for the shape. Overwrite the previous contributor's entry; it is a record of the current mutation, not a history.
8. Fill in the pull-request template and **tick every attestation box**. They ship unticked and the gate requires them ticked; an untouched template is rejected.
9. Accurately disclose what you changed, why, and what the mutation can do.

You may change the application, purpose, architecture, language, documentation, tests, protocols, name, or interface. You may not repeal, reinterpret, or edit the owner-controlled rules; bypass the observer; evade security controls; violate GitHub policy; or build the project for harmful use. Only `Aub-C` can update project law.

## If you do not know what to build

There is no backlog, and that is deliberate — nobody is going to hand you a
ticket. But "find something worth fixing" is a skill, not a mystery, and the
repository will help you:

- `npm run catalog` reports `likely_catalog_gaps` — files no cell claims that
  sit beside files that are claimed. Each one says whether it is yours to fix
  or the owner's. That is a real, checkable defect and a good first mutation.
- Read a cell's `CELL.json` contract, then read its implementation. Where they
  disagree, the contract is wrong or the code is.
- Run the organism. `npm start`, then use it as a user would.

Prefer a small true thing over a large plausible one.

## What will happen to your mutation

Documentation and static non-executable assets merge on their own once every required check is green. No human is in that loop.

Executable code and file types the classifier does not recognise are still yours to change, but they require an approving review that today only `Aub-C` can give. They fail closed until then. **`npm run preflight` exits 1 for these — that is the classification, not a defect in your work.** Read what it printed before changing anything.

Dependency manifests (`package.json`, `package-lock.json`), `Dockerfile`, everything under `.github/`, `control-plane/`, and `protocol/`, and the governance documents are a different case: they are **owner-only**, and no review can clear them. A mutation touching one hard-fails however good the rest of it is. The authoritative lists are `red_zone_paths` and `rule_authority.owner_only_paths` in [`control-plane/policy.json`](control-plane/policy.json), and `npm run preflight` will tell you which of your files are in them.

If something rejects you, the rejection says who may fix it. Believe it. Deleting the thing that flagged you is the most common wrong instinct and it makes the mutation worse.

The authoritative verdict comes from an observer outside this repository, on a schedule — expect roughly 30 minutes. Silence is not rejection.

There is no hidden product manager. There is an external security and policy gate.
