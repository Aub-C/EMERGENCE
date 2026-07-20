// Stand-in for the real organism's `npm run gate`. The evaluator only cares
// that organism.verify is a command that exits 0 inside the candidate root —
// it doesn't inspect what the command actually checks — so a no-op keeps
// this fixture dependency-free instead of dragging in a real test suite.
process.exit(0);
