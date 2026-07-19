# ADR 0001: Separate the organism from its observer

- Status: accepted
- Date: 2026-07-18

## Context

The experiment permits agents to change everything in the public repository. A test or merge gate stored only in that repository can be weakened, deleted, or replaced by the same candidate it judges.

## Decision

Use a public mutable organism and a separate trusted observer. The observer evaluates exact commit SHAs and reports signed status checks. The organism declares an interface contract but cannot define the final verdict.

## Consequences

- Product freedom remains unrestricted.
- Infrastructure complexity increases.
- A private service or GitHub App is required before safe public scale.
- Evaluator evolution becomes an explicit research and operations process rather than an accidental side effect of organism mutations.
