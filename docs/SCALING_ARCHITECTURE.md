# Scaling Architecture

EMERGENCE should be understandable by one agent even if it eventually contains millions of files and thousands of independently evolving capabilities. The solution is not a larger root prompt. It is a repository that compiles a small, relevant context packet for each mutation.

## Core model: federated cells

A **cell** is the smallest capability that can be understood, validated, evolved, deprecated, or replaced independently. Each cell has a stable identifier and a nearby `CELL.json` manifest.

A cell manifest declares:

- purpose and lifecycle status;
- repository paths it owns;
- executable and human entrypoints;
- public interfaces and contracts;
- dependencies by stable cell ID;
- capabilities already present;
- the minimum files an agent should read;
- validation commands;
- security behavior and required disclosure;
- safe extension points;
- architectural decisions that still govern the cell.

The root application is currently the `core.seed` cell. New capabilities should become separate cells when they can evolve or fail independently.

## Why this scales

### Bounded context

An agent should not read the whole repository. `npm run orient -- --cell <id>` produces a machine-readable context packet containing:

1. mandatory project law and its fingerprints;
2. the current mission;
3. the target cell manifest;
4. dependency manifests;
5. direct dependents;
6. recent commits touching the cell;
7. recent semantic ledger events;
8. a deterministic read plan;
9. validation and extension guidance.

The packet grows with the local dependency neighborhood, not total repository size.

### No central hot file

Do not maintain one giant hand-edited registry of every feature. Agents discover distributed `CELL.json` files and build the catalog. This avoids a single manifest becoming a constant merge-conflict bottleneck.

Root files describe laws, protocols, and discovery conventions. Cell-specific knowledge stays with its cell.

### Stable identities, replaceable implementations

Paths, languages, teams, and implementations can change. Cell IDs and interface contracts are the durable references. A replacement cell may supersede another without erasing history.

### Contract-first composition

Cells depend on declared interfaces rather than undocumented implementation details. Tests should verify contracts at cell boundaries. Cross-cell imports that are not represented in manifests are architectural debt and should eventually fail the gate.

### Append-only history

Git remains the source of exact history. Architecture decisions and the `.emergence/ledger.ndjson` provide semantic history: why a change happened, what capability appeared, and what was replaced. Avoid rewriting past events.

## Repository conventions

```text
RULES.md                       Owner-controlled project law
START_HERE.md                  Minimal universal orientation
AGENTS.md                      Universal agent protocol
CELL.json                      Root organism cell
cells/<stable-id>/CELL.json    Future independently evolving cells
protocol/                      Schemas and interoperability contracts
docs/adr/                      Durable architectural decisions
.emergence/ledger.ndjson       Append-only semantic events
scripts/catalog.mjs            Discovers and validates cells
scripts/orient.mjs             Compiles bounded agent context
```

Cells may live outside `cells/` when proximity to an existing subsystem is clearer, but every independently evolvable subsystem must have one authoritative `CELL.json`.

## Split criteria

Create a new cell when any of these become true:

- the capability has its own runtime or deployment lifecycle;
- it can be replaced without replacing its parent;
- it has a distinct security or permission boundary;
- it has independent tests or service-level objectives;
- multiple agents routinely change it without needing the parent implementation;
- its local read plan is becoming too large;
- it serves a stable interface used by other cells.

Do not create cells merely for every directory or class. The goal is autonomous comprehension, not metadata inflation.

## Knowledge hierarchy

Use four levels:

1. **Project law:** owner-controlled and universal.
2. **Protocols:** stable schemas understood by all cells and observers.
3. **Cell contracts:** authoritative local structure and interfaces.
4. **Implementation notes:** replaceable prose close to the code.

When prose disagrees with executable behavior, the discrepancy must be surfaced. Neither prose nor candidate-owned tests may override project law or the external observer.

## Future federation

A very large EMERGENCE can later split into multiple repositories without changing the mental model. A remote cell manifest can add repository and commit coordinates while retaining the same stable cell ID and interface contract. The observer can build a cross-repository catalog and dependency graph.

Do not split repositories early. Begin as a monorepo for atomic changes and easy discovery; federate only when checkout size, CI isolation, permissions, or release independence provide a measurable benefit.

## Required gate additions

As the cell system grows, CI should enforce:

- unique stable cell IDs;
- valid manifests and existing dependencies;
- no undeclared cross-cell imports;
- interface contract tests;
- bounded dependency depth and cycle reporting;
- security classification changes receiving the appropriate review;
- retired cells identifying replacements or preserved rationale;
- every executable change mapping to at least one cell.

This structure preserves creative freedom while preventing the repository from becoming unknowable.
