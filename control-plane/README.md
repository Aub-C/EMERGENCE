# EMERGENCE Observer Bootstrap

This directory is a bootstrap implementation of the trusted observer. Before the public experiment opens, extract it into a separate private repository such as `Aub-C/emergence-control`.

The public organism must never be able to change the evaluator used to approve its own mutation.

The observer:

- reads `.emergence/organism.json` as an interface contract;
- runs declared commands without invoking a shell;
- applies hard timeouts;
- performs independent repository scans;
- starts the candidate and verifies its health contract;
- emits a machine-readable result;
- never injects deployment credentials into candidate execution.

The bootstrap evaluator runs directly on the host for development. Production evaluation must execute inside an ephemeral VM or container with no secrets, no internal network access, bounded CPU/memory/disk, and a hard wall-clock timeout.
