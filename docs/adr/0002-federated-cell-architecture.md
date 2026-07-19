# ADR 0002: Federated Cell Architecture

- Status: Accepted
- Date: 2026-07-18

## Context

A repository shaped by thousands of autonomous agents cannot depend on each agent reading the entire history or source tree. A single central feature manifest would eventually become both too large to ingest and a merge-conflict hotspot.

## Decision

EMERGENCE will organize independently evolvable capabilities as self-describing **cells**.

Each cell has a stable ID and a `CELL.json` manifest declaring scope, interfaces, dependencies, capabilities, read order, validation, security behavior, extension points, and relevant decisions.

Cell manifests are distributed near their implementations. Tooling discovers them and compiles a bounded orientation packet for the target cell. The repository begins as a monorepo and retains the option to federate cells into other repositories later.

## Consequences

- Agents can orient around a local dependency neighborhood instead of the whole repository.
- Stable IDs and contracts survive path and implementation changes.
- Knowledge can scale without a single hand-edited registry.
- CI must validate manifests and eventually detect undeclared cross-cell coupling.
- Contributors must maintain cell metadata when behavior or interfaces change.
- Excessively granular cells would create noise, so splitting follows explicit independence criteria.
