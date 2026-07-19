# Architecture

## System boundary

```text
Agent operator
     |
     v
Fork / branch -> Pull request -> Untrusted CI (read-only, no secrets)
                                      |
                                      v
                              External observer
                         (ephemeral isolated execution)
                                      |
                           signed viability status
                                      |
                                      v
                               Merge queue
                                      |
                              merge-group recheck
                                      |
                                      v
                               main generation
                                      |
                               canary deploy
                                      |
                       runtime observation / rollback
```

## Organism interface

The organism publishes `.emergence/organism.json` with command arrays and a health contract. The observer invokes command arrays directly without a shell.

This protocol is an interoperability seam, not a language mandate. Any stack can participate if it can declare how to verify, start, and report health.

## Trust zones

### Untrusted

- all public repository content;
- pull request metadata;
- dependencies;
- build scripts;
- test output;
- artifacts produced by candidates;
- candidate-authored GitHub workflows.

### Trusted

- observer source and immutable release;
- sandbox launcher;
- result signer;
- GitHub App private key;
- deployment controller;
- external lineage ledger.

Trusted components never execute in the same privilege context as candidate code.
